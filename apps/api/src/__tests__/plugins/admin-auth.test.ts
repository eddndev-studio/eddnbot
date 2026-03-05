import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";

describe("admin auth (adminOnly flag)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();

    app.get("/test-admin", { config: { adminOnly: true } }, async () => {
      return { ok: true };
    });

    app.get("/test-admin-tenant", { config: { adminOnly: true } }, async (request) => {
      return { hasTenant: request.tenant !== null };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without X-Admin-Token header", async () => {
    const res = await app.inject({ method: "GET", url: "/test-admin" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Invalid admin token" });
  });

  it("returns 401 with incorrect token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-admin",
      headers: { "x-admin-token": "wrong-token" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Invalid admin token" });
  });

  it("returns 200 with correct admin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-admin",
      headers: { "x-admin-token": ADMIN_SECRET },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("does not require X-Api-Key header", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-admin",
      headers: { "x-admin-token": ADMIN_SECRET },
    });
    expect(res.statusCode).toBe(200);
  });

  it("does not populate request.tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-admin-tenant",
      headers: { "x-admin-token": ADMIN_SECRET },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().hasTenant).toBe(false);
  });
});
