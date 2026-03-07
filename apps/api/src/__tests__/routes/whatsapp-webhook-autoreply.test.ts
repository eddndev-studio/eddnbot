import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { conversations, messages } from "@eddnbot/db/schema";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedWhatsAppAccount, seedAiConfig } from "../helpers/seed";
import { testDb } from "../helpers/test-db";

// Mock the AI engine to avoid real API calls
vi.mock("@eddnbot/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@eddnbot/ai")>();
  return {
    ...actual,
    createAiEngine: vi.fn(() => ({
      chat: vi.fn(async () => ({
        content: "AI auto-reply!",
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: "stop",
      })),
    })),
    createWhisperAdapter: vi.fn(() => ({
      transcribe: vi.fn(async () => ({
        text: "transcribed audio text",
      })),
    })),
  };
});

let app: FastifyInstance;

const APP_SECRET = "test-whatsapp-app-secret";

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  app.pendingAutoReplies.length = 0;
});

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
}

function makeWebhookPayload(
  phoneNumberId: string,
  msg: { from: string; id: string; type: string; [key: string]: unknown },
) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+1234567890",
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: "Auto User" }, wa_id: msg.from }],
              messages: [msg],
            },
          },
        ],
      },
    ],
  });
}

describe("POST /whatsapp/webhook (auto-reply)", () => {
  it("triggers auto-reply when autoReplyEnabled=true + aiConfigId set", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-phone-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    // Mock fetch for WhatsApp API calls (sendMessage, markAsRead)
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5491100101010", wa_id: "5491100101010" }],
        messages: [{ id: "wamid.reply-auto" }],
      }),
    } as Response);

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100101010",
      id: `wamid.ar-${Date.now()}`,
      timestamp: "1700000000",
      type: "text",
      text: { body: "Hello bot!" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);

    // Wait for fire-and-forget processing
    await Promise.all(app.pendingAutoReplies);

    // Verify outbound message was stored
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    expect(convs).toHaveLength(1);

    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    const outbound = msgs.find((m) => m.direction === "outbound");
    expect(outbound).toBeDefined();
    expect(outbound!.content).toEqual({ text: { body: "AI auto-reply!" } });

    fetchSpy.mockRestore();
  });

  it("does NOT trigger when autoReplyEnabled=false", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-no-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: false,
    });

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100202020",
      id: `wamid.arno-${Date.now()}`,
      timestamp: "1700000000",
      type: "text",
      text: { body: "Hello?" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await Promise.all(app.pendingAutoReplies);

    // No outbound message should exist
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    expect(msgs.every((m) => m.direction === "inbound")).toBe(true);
  });

  it("does NOT trigger when aiConfigId is null", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-null-${Date.now()}`,
      autoReplyEnabled: true,
      // aiConfigId is null by default
    });

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100303030",
      id: `wamid.arnull-${Date.now()}`,
      timestamp: "1700000000",
      type: "text",
      text: { body: "No config" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await Promise.all(app.pendingAutoReplies);

    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    expect(msgs.every((m) => m.direction === "inbound")).toBe(true);
  });

  it("stores AI response as outbound message", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, {
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "You are helpful",
    });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-store-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5491100404040", wa_id: "5491100404040" }],
        messages: [{ id: "wamid.stored" }],
      }),
    } as Response);

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100404040",
      id: `wamid.arstore-${Date.now()}`,
      timestamp: "1700000000",
      type: "text",
      text: { body: "Store this reply" },
    });

    await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    await Promise.all(app.pendingAutoReplies);

    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    const outbound = msgs.find((m) => m.direction === "outbound");
    expect(outbound).toBeDefined();
    expect(outbound!.status).toBe("sent");
    expect(outbound!.sentAt).toBeInstanceOf(Date);
    expect(outbound!.type).toBe("text");

    fetchSpy.mockRestore();
  });

  it("returns 200 regardless of AI failure", async () => {
    const { createAiEngine } = await import("@eddnbot/ai");
    vi.mocked(createAiEngine).mockReturnValueOnce({
      chat: vi.fn(async () => {
        throw new Error("AI is down");
      }),
      async *chatStream() {
        throw new Error("AI is down");
      },
    });

    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-fail-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100505050",
      id: `wamid.arfail-${Date.now()}`,
      timestamp: "1700000000",
      type: "text",
      text: { body: "Trigger failure" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    // 200 should be returned regardless
    expect(response.statusCode).toBe(200);
    await Promise.all(app.pendingAutoReplies);
  });

  it("handles audio: download → transcribe → AI reply", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-audio-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    // Mock fetch:
    //   1-2: downloadPendingMedia (getMediaUrl + downloadMedia for storage)
    //   3-4: conversation handler (getMediaUrl + downloadMedia for Whisper)
    //   5+:  sendMessage / markAsRead
    const mediaUrlResponse = {
      ok: true, status: 200,
      json: async () => ({
        url: "https://lookaside.fbsbx.com/media/audio.ogg",
        mime_type: "audio/ogg", sha256: "abc", file_size: 1000, id: "media-audio-ar",
      }),
    } as Response;
    const mediaDownloadResponse = {
      ok: true, status: 200,
      arrayBuffer: async () => new ArrayBuffer(100),
      headers: { get: () => "audio/ogg" },
    } as unknown as Response;
    const whatsappApiResponse = {
      ok: true, status: 200,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5491100606060", wa_id: "5491100606060" }],
        messages: [{ id: "wamid.audio-reply" }],
      }),
    } as Response;

    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mediaUrlResponse)
      .mockResolvedValueOnce(mediaDownloadResponse)
      .mockResolvedValueOnce(mediaUrlResponse)
      .mockResolvedValueOnce(mediaDownloadResponse)
      .mockResolvedValue(whatsappApiResponse);

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100606060",
      id: `wamid.araudio-${Date.now()}`,
      timestamp: "1700000000",
      type: "audio",
      audio: { id: "media-audio-ar", mime_type: "audio/ogg", sha256: "abc" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await Promise.all(app.pendingAutoReplies);

    // Verify outbound was stored
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    const outbound = msgs.find((m) => m.direction === "outbound");
    expect(outbound).toBeDefined();
    expect(outbound!.content).toEqual({ text: { body: "AI auto-reply!" } });

    fetchSpy.mockRestore();
  });

  it("skips auto-reply for image messages (but downloads media)", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-img-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    // Mock fetch for media download (downloadPendingMedia)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({
          url: "https://lookaside.fbsbx.com/media/photo.jpg",
          mime_type: "image/jpeg", sha256: "abc", file_size: 5000, id: "img-123",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        arrayBuffer: async () => new ArrayBuffer(5000),
        headers: { get: () => "image/jpeg" },
      } as unknown as Response);

    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100707070",
      id: `wamid.arimg-${Date.now()}`,
      timestamp: "1700000000",
      type: "image",
      image: { id: "img-123", mime_type: "image/jpeg", sha256: "abc" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await Promise.all(app.pendingAutoReplies);

    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    // Only inbound message, no outbound
    expect(msgs).toHaveLength(1);
    expect(msgs[0].direction).toBe("inbound");

    fetchSpy.mockRestore();
  });

  it("handles duplicate messages (no double auto-reply)", async () => {
    const tenant = await seedTenant();
    const config = await seedAiConfig(tenant.id, { provider: "openai", model: "gpt-4o" });
    const account = await seedWhatsAppAccount(tenant.id, {
      phoneNumberId: `ar-dupe-${Date.now()}`,
      aiConfigId: config.id,
      autoReplyEnabled: true,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "5491100808080", wa_id: "5491100808080" }],
        messages: [{ id: "wamid.dupe-reply" }],
      }),
    } as Response);

    const waMessageId = `wamid.ardupe-${Date.now()}`;
    const payload = makeWebhookPayload(account.phoneNumberId, {
      from: "5491100808080",
      id: waMessageId,
      timestamp: "1700000000",
      type: "text",
      text: { body: "Duplicate test" },
    });

    // Send twice
    await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-hub-signature-256": sign(payload) },
      payload,
    });
    await Promise.all(app.pendingAutoReplies);
    app.pendingAutoReplies.length = 0;

    await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-hub-signature-256": sign(payload) },
      payload,
    });
    await Promise.all(app.pendingAutoReplies);

    // Should only have 1 inbound + 1 outbound (not 2 outbounds)
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));

    const outbounds = msgs.filter((m) => m.direction === "outbound");
    expect(outbounds).toHaveLength(1);

    fetchSpy.mockRestore();
  });
});
