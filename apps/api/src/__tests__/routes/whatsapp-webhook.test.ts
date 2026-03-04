import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { conversations, messages } from "@eddnbot/db/schema";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedWhatsAppAccount, seedConversation } from "../helpers/seed";
import { testDb } from "../helpers/test-db";

let app: FastifyInstance;

const APP_SECRET = "test-whatsapp-app-secret";
const VERIFY_TOKEN = "test-whatsapp-verify-token";

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
}

describe("GET /whatsapp/webhook (challenge verification)", () => {
  it("returns the challenge when token matches", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test-challenge-123`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("test-challenge-123");
  });

  it("returns 403 for wrong verify token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc",
    });

    expect(response.statusCode).toBe(403);
  });

  it("returns 403 for wrong mode", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc`,
    });

    expect(response.statusCode).toBe(403);
  });
});

describe("POST /whatsapp/webhook (incoming messages)", () => {
  it("returns 200 always to Meta", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns 401 for invalid signature", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=invalid",
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
  });

  it("creates conversation and stores inbound message", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "wh-phone-1" });

    const payload = JSON.stringify({
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
                  phone_number_id: "wh-phone-1",
                },
                contacts: [{ profile: { name: "Alice" }, wa_id: "5491100001111" }],
                messages: [
                  {
                    from: "5491100001111",
                    id: "wamid.msg001",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Hello from WhatsApp!" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);

    // Verify conversation was created
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    expect(convs).toHaveLength(1);
    expect(convs[0].contactPhone).toBe("5491100001111");
    expect(convs[0].contactName).toBe("Alice");

    // Verify message was stored
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));
    expect(msgs).toHaveLength(1);
    expect(msgs[0].waMessageId).toBe("wamid.msg001");
    expect(msgs[0].direction).toBe("inbound");
    expect(msgs[0].type).toBe("text");
    expect(msgs[0].status).toBe("received");
  });

  it("updates existing conversation on new message from same contact", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "wh-phone-2" });
    await seedConversation(account.id, {
      contactPhone: "5491100002222",
      contactName: "Bob",
    });

    const payload = JSON.stringify({
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
                  phone_number_id: "wh-phone-2",
                },
                contacts: [{ profile: { name: "Bob Updated" }, wa_id: "5491100002222" }],
                messages: [
                  {
                    from: "5491100002222",
                    id: "wamid.msg002",
                    timestamp: "1700000001",
                    type: "text",
                    text: { body: "Second message" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    // Should still have only 1 conversation
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    expect(convs).toHaveLength(1);

    // But now 1 new message
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));
    expect(msgs).toHaveLength(1);
    expect(msgs[0].waMessageId).toBe("wamid.msg002");
  });

  it("handles status updates (delivered)", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "wh-phone-3" });
    const conv = await seedConversation(account.id, { contactPhone: "5491100003333" });

    // Seed an outbound message
    await testDb.insert(messages).values({
      conversationId: conv.id,
      waMessageId: "wamid.out001",
      direction: "outbound",
      type: "text",
      content: { text: { body: "Hi" } },
      status: "sent",
    });

    const payload = JSON.stringify({
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
                  phone_number_id: "wh-phone-3",
                },
                statuses: [
                  {
                    id: "wamid.out001",
                    status: "delivered",
                    timestamp: "1700000002",
                    recipient_id: "5491100003333",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);

    // Verify status updated
    const [msg] = await testDb
      .select()
      .from(messages)
      .where(eq(messages.waMessageId, "wamid.out001"));
    expect(msg.status).toBe("delivered");
    expect(msg.deliveredAt).toBeInstanceOf(Date);
  });

  it("handles status updates (read)", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "wh-phone-4" });
    const conv = await seedConversation(account.id, { contactPhone: "5491100004444" });

    await testDb.insert(messages).values({
      conversationId: conv.id,
      waMessageId: "wamid.out002",
      direction: "outbound",
      type: "text",
      content: { text: { body: "Hi" } },
      status: "delivered",
    });

    const payload = JSON.stringify({
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
                  phone_number_id: "wh-phone-4",
                },
                statuses: [
                  {
                    id: "wamid.out002",
                    status: "read",
                    timestamp: "1700000003",
                    recipient_id: "5491100004444",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    const [msg] = await testDb
      .select()
      .from(messages)
      .where(eq(messages.waMessageId, "wamid.out002"));
    expect(msg.status).toBe("read");
    expect(msg.readAt).toBeInstanceOf(Date);
  });

  it("ignores events for unknown phone_number_id", async () => {
    const payload = JSON.stringify({
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
                  display_phone_number: "+999",
                  phone_number_id: "unknown-phone",
                },
                messages: [
                  {
                    from: "111",
                    id: "wamid.orphan",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Lost" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(payload),
      },
      payload,
    });

    // Still returns 200 to Meta
    expect(response.statusCode).toBe(200);
  });

  it("handles duplicate message IDs (idempotent)", async () => {
    const tenant = await seedTenant();
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "wh-phone-5" });

    const payload = JSON.stringify({
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
                  phone_number_id: "wh-phone-5",
                },
                contacts: [{ profile: { name: "Eve" }, wa_id: "5491100005555" }],
                messages: [
                  {
                    from: "5491100005555",
                    id: "wamid.dupe001",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Hello!" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    // Send twice
    await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-hub-signature-256": sign(payload) },
      payload,
    });
    await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-hub-signature-256": sign(payload) },
      payload,
    });

    // Should only have 1 message
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    expect(convs).toHaveLength(1);

    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));
    expect(msgs).toHaveLength(1);
  });
});
