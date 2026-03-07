import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedWhatsAppAccount } from "../helpers/seed";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /whatsapp/accounts/:accountId/templates", () => {
  it("lists templates from Meta API", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const templates = [
      { id: "1", name: "hello", language: "en_US", category: "MARKETING", status: "APPROVED", components: [] },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: templates, paging: {} }),
    } as Response);

    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${account.id}/templates`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("hello");

    vi.restoreAllMocks();
  });

  it("passes query filters to Meta API", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [], paging: {} }),
    } as Response);

    await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${account.id}/templates?status=APPROVED&category=MARKETING`,
      headers: { "x-api-key": rawKey },
    });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("status=APPROVED");
    expect(calledUrl).toContain("category=MARKETING");

    vi.restoreAllMocks();
  });

  it("returns 404 for account from another tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-tmpl-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-tmpl-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const other = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${other.id}/templates`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/accounts/00000000-0000-0000-0000-000000000000/templates",
    });

    expect(response.statusCode).toBe(401);
  });

  it("forwards Meta API errors", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid token", code: 190 } }),
    } as Response);

    const response = await app.inject({
      method: "GET",
      url: `/whatsapp/accounts/${account.id}/templates`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Invalid token");

    vi.restoreAllMocks();
  });
});

describe("POST /whatsapp/accounts/:accountId/templates", () => {
  it("creates a template via Meta API", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "tmpl-new", status: "PENDING", category: "UTILITY" }),
    } as Response);

    const response = await app.inject({
      method: "POST",
      url: `/whatsapp/accounts/${account.id}/templates`,
      headers: { "x-api-key": rawKey },
      payload: {
        name: "order_confirm",
        language: "en_US",
        category: "UTILITY",
        components: [{ type: "BODY", text: "Your order {{1}} is confirmed." }],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBe("tmpl-new");
    expect(body.status).toBe("PENDING");

    vi.restoreAllMocks();
  });

  it("validates template name format", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: `/whatsapp/accounts/${account.id}/templates`,
      headers: { "x-api-key": rawKey },
      payload: {
        name: "BAD NAME!",
        language: "en_US",
        category: "MARKETING",
        components: [{ type: "BODY", text: "Hi" }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("forwards Meta API error on create", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Duplicate template name", code: 100 } }),
    } as Response);

    const response = await app.inject({
      method: "POST",
      url: `/whatsapp/accounts/${account.id}/templates`,
      headers: { "x-api-key": rawKey },
      payload: {
        name: "duplicate_name",
        language: "en_US",
        category: "MARKETING",
        components: [{ type: "BODY", text: "Hi" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Duplicate template name");

    vi.restoreAllMocks();
  });
});

describe("DELETE /whatsapp/accounts/:accountId/templates/:templateName", () => {
  it("deletes a template and returns 204", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    const response = await app.inject({
      method: "DELETE",
      url: `/whatsapp/accounts/${account.id}/templates/old_template`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(204);

    vi.restoreAllMocks();
  });

  it("returns 404 for account from another tenant", async () => {
    const t1 = await seedTenant({ slug: `t1-del-${Date.now()}` });
    const t2 = await seedTenant({ slug: `t2-del-${Date.now()}` });
    const { rawKey } = await seedApiKey(t1.id);
    const other = await seedWhatsAppAccount(t2.id);

    const response = await app.inject({
      method: "DELETE",
      url: `/whatsapp/accounts/${other.id}/templates/some_template`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });
});
