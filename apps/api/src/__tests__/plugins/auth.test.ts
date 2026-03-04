import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey } from "../helpers/seed";

describe("auth plugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();

    // Register a protected test route before the app is ready
    app.get("/test-protected", async (request) => {
      return { tenantId: request.tenant.id };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("skips auth on routes with skipAuth config", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("returns 401 when x-api-key header is missing on protected routes", async () => {
    const res = await app.inject({ method: "GET", url: "/test-protected" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Missing API key" });
  });

  it("returns 401 when x-api-key is invalid", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { "x-api-key": "ek_live_invalid" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Invalid API key" });
  });

  it("authenticates a valid API key and decorates request", async () => {
    const tenant = await seedTenant({ slug: "auth-test" });
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { "x-api-key": rawKey },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenantId).toBe(tenant.id);
  });

  it("returns 401 for a revoked API key", async () => {
    const tenant = await seedTenant({ slug: "auth-revoked" });
    const { rawKey } = await seedApiKey(tenant.id, {
      revokedAt: new Date(),
    });

    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { "x-api-key": rawKey },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Invalid API key" });
  });

  it("returns 401 for an expired API key", async () => {
    const tenant = await seedTenant({ slug: "auth-expired" });
    const { rawKey } = await seedApiKey(tenant.id, {
      expiresAt: new Date("2020-01-01"),
    });

    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { "x-api-key": rawKey },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "API key expired" });
  });

  it("returns 403 for an inactive tenant", async () => {
    const tenant = await seedTenant({ slug: "auth-inactive", isActive: false });
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { "x-api-key": rawKey },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "Tenant is inactive" });
  });
});
