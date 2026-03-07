import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { conversations, messages } from "@eddnbot/db/schema";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedWhatsAppAccount } from "../helpers/seed";
import { testDb } from "../helpers/test-db";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// Mock global fetch for WhatsApp API calls
const mockFetchResponse = {
  messaging_product: "whatsapp",
  contacts: [{ input: "5491155551234", wa_id: "5491155551234" }],
  messages: [{ id: "wamid.sent001" }],
};

describe("POST /whatsapp/send", () => {
  it("sends a text message and stores it", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "send-phone-1" });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockFetchResponse,
    } as Response);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send",
      headers: { "x-api-key": rawKey },
      payload: {
        accountId: account.id,
        to: "5491155551234",
        type: "text",
        text: { body: "Hello from API!" },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.waMessageId).toBe("wamid.sent001");

    // Verify conversation created
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    expect(convs).toHaveLength(1);
    expect(convs[0].contactPhone).toBe("5491155551234");

    // Verify message stored
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));
    expect(msgs).toHaveLength(1);
    expect(msgs[0].direction).toBe("outbound");
    expect(msgs[0].waMessageId).toBe("wamid.sent001");
    expect(msgs[0].status).toBe("sent");

    fetchSpy.mockRestore();
  });

  it("returns 404 when account does not belong to tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const otherAccount = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send",
      headers: { "x-api-key": rawKey },
      payload: {
        accountId: otherAccount.id,
        to: "123",
        type: "text",
        text: { body: "Hacked?" },
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for missing required fields", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send",
      headers: { "x-api-key": rawKey },
      payload: { accountId: "some-id" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send",
      payload: {
        accountId: "some-id",
        to: "123",
        type: "text",
        text: { body: "no auth" },
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /whatsapp/send-template", () => {
  it("sends a template message and stores it", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id, { phoneNumberId: "send-phone-2" });

    const templateResponse = {
      messaging_product: "whatsapp",
      contacts: [{ input: "5491155559999", wa_id: "5491155559999" }],
      messages: [{ id: "wamid.tmpl001" }],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => templateResponse,
    } as Response);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send-template",
      headers: { "x-api-key": rawKey },
      payload: {
        accountId: account.id,
        to: "5491155559999",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.waMessageId).toBe("wamid.tmpl001");

    // Verify message stored as template type
    const convs = await testDb
      .select()
      .from(conversations)
      .where(eq(conversations.whatsappAccountId, account.id));
    const msgs = await testDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convs[0].id));
    expect(msgs[0].type).toBe("template");

    fetchSpy.mockRestore();
  });

  it("returns 404 when account does not belong to tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const otherAccount = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send-template",
      headers: { "x-api-key": rawKey },
      payload: {
        accountId: otherAccount.id,
        to: "123",
        template: { name: "test", language: { code: "en" } },
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for missing template fields", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send-template",
      headers: { "x-api-key": rawKey },
      payload: { accountId: "some-id", to: "123" },
    });

    expect(response.statusCode).toBe(400);
  });
});
