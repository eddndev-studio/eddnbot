import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedAiConfig } from "../helpers/seed";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

async function authedRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  payload?: unknown,
) {
  const tenant = await seedTenant();
  const { rawKey } = await seedApiKey(tenant.id);
  const response = await app.inject({
    method,
    url,
    headers: { "x-api-key": rawKey },
    ...(payload ? { payload } : {}),
  });
  return { response, tenant };
}

describe("POST /ai/configs", () => {
  it("creates an ai config for the authenticated tenant", async () => {
    const { response, tenant } = await authedRequest("POST", "/ai/configs", {
      provider: "openai",
      model: "gpt-4o",
      label: "default",
      systemPrompt: "You are helpful.",
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.tenantId).toBe(tenant.id);
    expect(body.provider).toBe("openai");
    expect(body.model).toBe("gpt-4o");
    expect(body.label).toBe("default");
    expect(body.systemPrompt).toBe("You are helpful.");
    expect(body.temperature).toBeCloseTo(0.7);
    expect(body.maxOutputTokens).toBe(2048);
  });

  it("returns 400 for invalid provider", async () => {
    const { response } = await authedRequest("POST", "/ai/configs", {
      provider: "invalid",
      model: "some-model",
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 409 for duplicate tenant+label", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, { label: "dupe" });

    const response = await app.inject({
      method: "POST",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
      payload: { provider: "openai", model: "gpt-4o", label: "dupe" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/ai/configs",
      payload: { provider: "openai", model: "gpt-4o" },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("GET /ai/configs", () => {
  it("lists configs for the authenticated tenant", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, { label: "a" });
    await seedAiConfig(tenant.id, { label: "b" });

    const response = await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body.every((c: { tenantId: string }) => c.tenantId === tenant.id)).toBe(true);
  });

  it("does not return configs from other tenants", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    await seedAiConfig(tenant1.id, { label: "mine" });
    await seedAiConfig(tenant2.id, { label: "theirs" });

    const response = await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0].label).toBe("mine");
  });
});

describe("GET /ai/configs/:configId", () => {
  it("returns a specific config", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const config = await seedAiConfig(tenant.id);

    const response = await app.inject({
      method: "GET",
      url: `/ai/configs/${config.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(config.id);
  });

  it("returns 404 for config from another tenant", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    const otherConfig = await seedAiConfig(tenant2.id);

    const response = await app.inject({
      method: "GET",
      url: `/ai/configs/${otherConfig.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("PATCH /ai/configs/:configId", () => {
  it("updates a config", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const config = await seedAiConfig(tenant.id);

    const response = await app.inject({
      method: "PATCH",
      url: `/ai/configs/${config.id}`,
      headers: { "x-api-key": rawKey },
      payload: {
        model: "gpt-4o-mini",
        temperature: 0.5,
        systemPrompt: "Updated prompt",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBeCloseTo(0.5);
    expect(body.systemPrompt).toBe("Updated prompt");
  });

  it("returns 404 for config from another tenant", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    const otherConfig = await seedAiConfig(tenant2.id);

    const response = await app.inject({
      method: "PATCH",
      url: `/ai/configs/${otherConfig.id}`,
      headers: { "x-api-key": rawKey },
      payload: { model: "hack" },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("DELETE /ai/configs/:configId", () => {
  it("deletes a config and returns 204", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const config = await seedAiConfig(tenant.id);

    const response = await app.inject({
      method: "DELETE",
      url: `/ai/configs/${config.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(204);
  });

  it("returns 404 for non-existent config", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "DELETE",
      url: "/ai/configs/00000000-0000-0000-0000-000000000000",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });
});
