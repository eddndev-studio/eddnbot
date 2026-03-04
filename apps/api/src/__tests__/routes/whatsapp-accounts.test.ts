import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedWhatsAppAccount, seedAiConfig } from "../helpers/seed";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /whatsapp/accounts", () => {
  it("creates a whatsapp account for the authenticated tenant", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
      payload: {
        phoneNumberId: "111222333",
        wabaId: "waba-test-001",
        accessToken: "EAAx-real-token",
        displayPhoneNumber: "+5491155551234",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.tenantId).toBe(tenant.id);
    expect(body.phoneNumberId).toBe("111222333");
    expect(body.wabaId).toBe("waba-test-001");
    expect(body.displayPhoneNumber).toBe("+5491155551234");
    expect(body.isActive).toBe(true);
  });

  it("returns 400 for missing required fields", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
      payload: { phoneNumberId: "123" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 409 for duplicate phone_number_id", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedWhatsAppAccount(tenant.id, { phoneNumberId: "dupe-phone" });

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
      payload: {
        phoneNumberId: "dupe-phone",
        wabaId: "waba-002",
        accessToken: "token",
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      payload: {
        phoneNumberId: "123",
        wabaId: "waba",
        accessToken: "token",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("creates account with aiConfigId", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const config = await seedAiConfig(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
      payload: {
        phoneNumberId: `ai-cfg-${Date.now()}`,
        wabaId: "waba-ai",
        accessToken: "token",
        aiConfigId: config.id,
        autoReplyEnabled: true,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.aiConfigId).toBe(config.id);
    expect(body.autoReplyEnabled).toBe(true);
  });

  it("returns 422 when aiConfigId belongs to another tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-cfg-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-cfg-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const otherConfig = await seedAiConfig(t2.id);

    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
      payload: {
        phoneNumberId: `cross-cfg-${Date.now()}`,
        wabaId: "waba-cross",
        accessToken: "token",
        aiConfigId: otherConfig.id,
      },
    });

    expect(response.statusCode).toBe(422);
  });
});

describe("GET /whatsapp/accounts", () => {
  it("lists accounts for the authenticated tenant", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedWhatsAppAccount(tenant.id, { phoneNumberId: "a1" });
    await seedWhatsAppAccount(tenant.id, { phoneNumberId: "a2" });

    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body.every((a: { tenantId: string }) => a.tenantId === tenant.id)).toBe(true);
  });

  it("does not return accounts from other tenants", async () => {
    const t1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    await seedWhatsAppAccount(t1.id, { phoneNumberId: "mine" });
    await seedWhatsAppAccount(t2.id, { phoneNumberId: "theirs" });

    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/accounts",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0].phoneNumberId).toBe("mine");
  });
});

describe("GET /whatsapp/accounts/:accountId", () => {
  it("returns a specific account", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${account.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(account.id);
  });

  it("returns 404 for account from another tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const other = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${other.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("PATCH /whatsapp/accounts/:accountId", () => {
  it("updates an account", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const response = await app.inject({
      method: "PATCH",
      url: `/whatsapp/accounts/${account.id}`,
      headers: { "x-api-key": rawKey },
      payload: {
        displayPhoneNumber: "+1999888777",
        isActive: false,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.displayPhoneNumber).toBe("+1999888777");
    expect(body.isActive).toBe(false);
  });

  it("returns 404 for account from another tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const other = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "PATCH",
      url: `/whatsapp/accounts/${other.id}`,
      headers: { "x-api-key": rawKey },
      payload: { isActive: false },
    });

    expect(response.statusCode).toBe(404);
  });

  it("updates aiConfigId and autoReplyEnabled", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const config = await seedAiConfig(tenant.id);

    const response = await app.inject({
      method: "PATCH",
      url: `/whatsapp/accounts/${account.id}`,
      headers: { "x-api-key": rawKey },
      payload: {
        aiConfigId: config.id,
        autoReplyEnabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.aiConfigId).toBe(config.id);
    expect(body.autoReplyEnabled).toBe(true);
  });
});

describe("DELETE /whatsapp/accounts/:accountId", () => {
  it("deletes an account and returns 204", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const response = await app.inject({
      method: "DELETE",
      url: `/whatsapp/accounts/${account.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(204);
  });

  it("returns 404 for non-existent account", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "DELETE",
      url: "/whatsapp/accounts/00000000-0000-0000-0000-000000000000",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });
});
