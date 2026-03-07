import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedAiConfig } from "../helpers/seed";

// Mock the AI engine to avoid real API calls
vi.mock("@eddnbot/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@eddnbot/ai")>();
  return {
    ...actual,
    createAiEngine: vi.fn(() => ({
      chat: vi.fn(async () => ({
        content: "Hello from mocked AI!",
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: "stop",
      })),
    })),
  };
});

import { createAiEngine } from "@eddnbot/ai";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /ai/chat", () => {
  it("returns AI response using config by label", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, { label: "default", provider: "openai", model: "gpt-4o" });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        label: "default",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.content).toBe("Hello from mocked AI!");
    expect(body.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
    expect(body.finishReason).toBe("stop");
  });

  it("returns AI response using configId", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const config = await seedAiConfig(tenant.id, {
      label: "custom",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        configId: config.id,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().content).toBe("Hello from mocked AI!");
  });

  it("defaults to 'default' label when no label or configId given", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, { label: "default", provider: "openai", model: "gpt-4o" });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("passes correct config to AI engine", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, {
      label: "default",
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "Be helpful",
      temperature: 0.5,
      maxOutputTokens: 1024,
      thinkingConfig: { provider: "openai", config: { effort: "high" } },
    });

    await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(createAiEngine).toHaveBeenCalledWith({ provider: "openai" });
    const mockEngine = vi.mocked(createAiEngine).mock.results.at(-1)!.value;
    expect(mockEngine.chat).toHaveBeenCalledWith(
      [{ role: "user", content: "Hello" }],
      expect.objectContaining({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-test-fake-key",
        systemPrompt: "Be helpful",
        temperature: 0.5,
        maxOutputTokens: 1024,
        thinking: { provider: "openai", config: { effort: "high" } },
      }),
    );
  });

  it("returns 404 when config not found", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        label: "nonexistent",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 422 when provider API key is missing", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedAiConfig(tenant.id, {
      label: "default",
      provider: "openai",
      model: "gpt-4o",
    });

    // Temporarily remove the API key from env
    const original = app.env.OPENAI_API_KEY;
    app.env.OPENAI_API_KEY = undefined;

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    app.env.OPENAI_API_KEY = original;

    expect(response.statusCode).toBe(422);
  });

  it("returns 400 for empty messages array", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: { "x-api-key": rawKey },
      payload: {
        messages: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      payload: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
