import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant } from "../helpers/seed";
import { testDb } from "../helpers/test-db";
import { saveMedia } from "../../services/media-storage";

let app: FastifyInstance;
const ADMIN_TOKEN = "test-admin-secret-that-is-at-least-32-chars-long";

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /api/media/:mediaId", () => {
  it("returns stored media with correct Content-Type", async () => {
    const tenant = await seedTenant();
    const content = Buffer.from("fake-jpeg-bytes");
    const waMediaId = `proxy-img-${Date.now()}`;

    await saveMedia(testDb, app.storage, {
      tenantId: tenant.id,
      waMediaId,
      buffer: content,
      mimeType: "image/jpeg",
      originalFilename: "photo.jpg",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/media/${waMediaId}`,
      headers: { "x-admin-token": ADMIN_TOKEN },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
    expect(response.headers["cache-control"]).toBe("private, max-age=86400, immutable");
    expect(response.headers["content-disposition"]).toBe('inline; filename="photo.jpg"');
    expect(Buffer.from(response.rawPayload)).toEqual(content);
  });

  it("returns 404 for nonexistent media", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/media/nonexistent-media-id",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when file is missing from storage", async () => {
    const tenant = await seedTenant();
    const waMediaId = `proxy-gone-${Date.now()}`;

    const record = await saveMedia(testDb, app.storage, {
      tenantId: tenant.id,
      waMediaId,
      buffer: Buffer.from("will-be-deleted"),
      mimeType: "audio/ogg",
    });

    // Delete the file manually from storage
    await app.storage.delete(record.storagePath);

    const response = await app.inject({
      method: "GET",
      url: `/api/media/${waMediaId}`,
      headers: { "x-admin-token": ADMIN_TOKEN },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Media file missing from storage" });
  });

  it("requires admin auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/media/some-id",
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid admin token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/media/some-id",
      headers: { "x-admin-token": "wrong-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("serves media without filename when originalFilename is null", async () => {
    const tenant = await seedTenant();
    const waMediaId = `proxy-noname-${Date.now()}`;

    await saveMedia(testDb, app.storage, {
      tenantId: tenant.id,
      waMediaId,
      buffer: Buffer.from("sticker-data"),
      mimeType: "image/webp",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/media/${waMediaId}`,
      headers: { "x-admin-token": ADMIN_TOKEN },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/webp");
    expect(response.headers["content-disposition"]).toBe("inline");
  });
});
