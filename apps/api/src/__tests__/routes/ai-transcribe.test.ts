import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import FormData from "form-data";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey } from "../helpers/seed";

vi.mock("@eddnbot/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@eddnbot/ai")>();
  return {
    ...actual,
    createWhisperAdapter: vi.fn(() => ({
      transcribe: vi.fn(async () => ({
        text: "Transcribed audio text",
        duration: 5.2,
        language: "en",
      })),
    })),
  };
});

import { createWhisperAdapter } from "@eddnbot/ai";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function buildMultipart(
  fields: Record<string, string> = {},
  file?: { name: string; content: Buffer; contentType?: string },
) {
  const form = new FormData();
  if (file) {
    form.append("file", file.content, {
      filename: file.name,
      contentType: file.contentType ?? "audio/mpeg",
    });
  }
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return {
    payload: form,
    headers: form.getHeaders(),
  };
}

describe("POST /ai/transcribe", () => {
  it("transcribes audio file successfully", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const { payload, headers } = buildMultipart({}, {
      name: "audio.mp3",
      content: Buffer.from("fake-audio"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.text).toBe("Transcribed audio text");
    expect(body.duration).toBe(5.2);
    expect(body.language).toBe("en");
  });

  it("passes optional parameters to adapter", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const { payload, headers } = buildMultipart(
      { model: "gpt-4o-transcribe", language: "es", prompt: "Transcribe", temperature: "0.3" },
      { name: "audio.wav", content: Buffer.from("fake-audio"), contentType: "audio/wav" },
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    expect(response.statusCode).toBe(200);

    const mockAdapter = vi.mocked(createWhisperAdapter).mock.results.at(-1)!.value;
    expect(mockAdapter.transcribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      "audio.wav",
      expect.objectContaining({
        model: "gpt-4o-transcribe",
        language: "es",
        prompt: "Transcribe",
        temperature: 0.3,
      }),
    );
  });

  it("defaults model to whisper-1", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const { payload, headers } = buildMultipart({}, {
      name: "audio.mp3",
      content: Buffer.from("fake-audio"),
    });

    await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    const mockAdapter = vi.mocked(createWhisperAdapter).mock.results.at(-1)!.value;
    expect(mockAdapter.transcribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      "audio.mp3",
      expect.objectContaining({ model: "whisper-1" }),
    );
  });

  it("returns 400 when no file is uploaded", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const { payload, headers } = buildMultipart({ model: "whisper-1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/file/i);
  });

  it("returns 400 for unsupported audio format", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const { payload, headers } = buildMultipart({}, {
      name: "document.pdf",
      content: Buffer.from("fake-pdf"),
      contentType: "application/pdf",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/format/i);
  });

  it("returns 401 without auth", async () => {
    const { payload, headers } = buildMultipart({}, {
      name: "audio.mp3",
      content: Buffer.from("fake-audio"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers,
      payload,
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 422 when OPENAI_API_KEY is missing", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const original = app.env.OPENAI_API_KEY;
    app.env.OPENAI_API_KEY = undefined;

    const { payload, headers } = buildMultipart({}, {
      name: "audio.mp3",
      content: Buffer.from("fake-audio"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    app.env.OPENAI_API_KEY = original;

    expect(response.statusCode).toBe(422);
    expect(response.json().error).toMatch(/OPENAI_API_KEY/);
  });

  it("returns 413 when file exceeds 25MB", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26 MB

    const { payload, headers } = buildMultipart({}, {
      name: "audio.mp3",
      content: largeBuffer,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ai/transcribe",
      headers: { ...headers, "x-api-key": rawKey },
      payload,
    });

    expect(response.statusCode).toBe(413);
  });
});
