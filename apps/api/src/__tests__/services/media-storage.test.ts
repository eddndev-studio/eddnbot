import { describe, it, expect, afterAll, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testDb, testClient } from "../helpers/test-db";
import { seedTenant, seedWhatsAppAccount, seedConversation, seedMessage } from "../helpers/seed";
import {
  saveMedia,
  getMediaByWaId,
  getMediaBuffer,
  deleteMedia,
  getStoragePath,
} from "../../services/media-storage";

let basePath: string;

async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `media-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

afterAll(async () => {
  await testClient.end();
});

afterEach(async () => {
  if (basePath) {
    await rm(basePath, { recursive: true, force: true });
  }
});

describe("media-storage", () => {
  describe("saveMedia", () => {
    it("writes file to disk and inserts DB row", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const buffer = Buffer.from("fake-image-bytes");

      const record = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId: `wa-img-${Date.now()}`,
        buffer,
        mimeType: "image/jpeg",
        originalFilename: "photo.jpg",
      });

      expect(record.tenantId).toBe(tenant.id);
      expect(record.mimeType).toBe("image/jpeg");
      expect(record.fileSize).toBe(buffer.length);
      expect(record.originalFilename).toBe("photo.jpg");

      // File exists on disk
      const diskContent = await readFile(record.storagePath);
      expect(diskContent).toEqual(buffer);
    });

    it("links media to a message when messageId provided", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id);
      const msg = await seedMessage(conv.id);

      const record = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId: `wa-linked-${Date.now()}`,
        messageId: msg.id,
        buffer: Buffer.from("file"),
        mimeType: "audio/ogg",
      });

      expect(record.messageId).toBe(msg.id);
    });

    it("is idempotent for duplicate waMediaId", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const waMediaId = `wa-dup-${Date.now()}`;
      const buffer = Buffer.from("data");

      const first = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId,
        buffer,
        mimeType: "image/png",
      });

      const second = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId,
        buffer,
        mimeType: "image/png",
      });

      expect(second.id).toBe(first.id);
    });
  });

  describe("getMediaByWaId", () => {
    it("returns media record for existing waMediaId", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const waMediaId = `wa-get-${Date.now()}`;

      await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId,
        buffer: Buffer.from("data"),
        mimeType: "video/mp4",
      });

      const found = await getMediaByWaId(testDb, waMediaId);
      expect(found).not.toBeNull();
      expect(found!.mimeType).toBe("video/mp4");
    });

    it("returns null for nonexistent waMediaId", async () => {
      const found = await getMediaByWaId(testDb, "nonexistent-id");
      expect(found).toBeNull();
    });
  });

  describe("getMediaBuffer", () => {
    it("reads file contents from storage path", async () => {
      basePath = await createTempDir();
      const content = Buffer.from("binary content");
      const filePath = join(basePath, "test-file");
      await writeFile(filePath, content);

      const result = await getMediaBuffer(filePath);
      expect(result).toEqual(content);
    });
  });

  describe("deleteMedia", () => {
    it("removes file from disk and DB row", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const waMediaId = `wa-del-${Date.now()}`;

      const record = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId,
        buffer: Buffer.from("to-delete"),
        mimeType: "image/gif",
      });

      const deleted = await deleteMedia(testDb, waMediaId);
      expect(deleted).toBe(true);

      // DB row gone
      const found = await getMediaByWaId(testDb, waMediaId);
      expect(found).toBeNull();

      // File gone
      await expect(stat(record.storagePath)).rejects.toThrow();
    });

    it("returns false for nonexistent media", async () => {
      const deleted = await deleteMedia(testDb, "nonexistent-delete");
      expect(deleted).toBe(false);
    });

    it("succeeds even if file is already gone from disk", async () => {
      basePath = await createTempDir();
      const tenant = await seedTenant();
      const waMediaId = `wa-gone-${Date.now()}`;

      const record = await saveMedia(testDb, basePath, {
        tenantId: tenant.id,
        waMediaId,
        buffer: Buffer.from("will-vanish"),
        mimeType: "image/webp",
      });

      // Manually delete the file first
      await rm(record.storagePath);

      // deleteMedia should still succeed (cleans up DB)
      const deleted = await deleteMedia(testDb, waMediaId);
      expect(deleted).toBe(true);
    });
  });

  describe("getStoragePath", () => {
    it("returns flat path under base directory", async () => {
      const path = getStoragePath("/data/media", "wa-media-123");
      expect(path).toBe("/data/media/wa-media-123");
    });
  });
});
