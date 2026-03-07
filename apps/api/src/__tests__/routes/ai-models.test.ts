import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey } from "../helpers/seed";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /ai/models", () => {
  it("returns all models", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "GET",
      url: "/api/ai/models",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.length).toBeGreaterThanOrEqual(22);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("provider");
    expect(body[0]).toHaveProperty("name");
    expect(body[0]).toHaveProperty("capabilities");
  });

  it("filters by provider", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "GET",
      url: "/api/ai/models?provider=anthropic",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.length).toBeGreaterThanOrEqual(4);
    expect(body.every((m: { provider: string }) => m.provider === "anthropic")).toBe(true);
  });

  it("returns empty for unknown provider", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "GET",
      url: "/api/ai/models?provider=unknown",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(0);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/ai/models",
    });

    expect(response.statusCode).toBe(401);
  });
});
