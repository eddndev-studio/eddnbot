import { describe, it, expect, afterAll, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testDb, testClient } from "../helpers/test-db";
import { seedTenant, seedWhatsAppAccount, seedConversation, seedMessage } from "../helpers/seed";
import {
  saveMedia,
  getMediaByWaId,
  getMediaBuffer,
  deleteMedia,
  storageKey,
} from "../../services/media-storage";
import { createFilesystemStorage } from "../../services/storage";
import type { StorageAdapter } from "../../services/storage";

let basePath: string;
let storage: StorageAdapter;

async function createTempStorage(): Promise<{ basePath: string; storage: StorageAdapter }> {
  const dir = join(tmpdir(), `media-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return { basePath: dir, storage: createFilesystemStorage(dir) };
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
    it("writes file to storage and inserts DB row", async () => {
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const buffer = Buffer.from("fake-image-bytes");

      const record = await saveMedia(testDb, storage, {
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

      // File exists in storage
      const stored = await getMediaBuffer(storage, record.storagePath);
      expect(stored).toEqual(buffer);
    });

    it("links media to a message when messageId provided", async () => {
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id);
      const msg = await seedMessage(conv.id);

      const record = await saveMedia(testDb, storage, {
        tenantId: tenant.id,
        waMediaId: `wa-linked-${Date.now()}`,
        messageId: msg.id,
        buffer: Buffer.from("file"),
        mimeType: "audio/ogg",
      });

      expect(record.messageId).toBe(msg.id);
    });

    it("is idempotent for duplicate waMediaId", async () => {
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const waMediaId = `wa-dup-${Date.now()}`;
      const buffer = Buffer.from("data");

      const first = await saveMedia(testDb, storage, {
        tenantId: tenant.id,
        waMediaId,
        buffer,
        mimeType: "image/png",
      });

      const second = await saveMedia(testDb, storage, {
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
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const waMediaId = `wa-get-${Date.now()}`;

      await saveMedia(testDb, storage, {
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
    it("reads file contents from storage", async () => {
      ({ basePath, storage } = await createTempStorage());
      const content = Buffer.from("binary content");
      await storage.put("test-key", content, "application/octet-stream");

      const result = await getMediaBuffer(storage, "test-key");
      expect(result).toEqual(content);
    });

    it("returns null for missing key", async () => {
      ({ basePath, storage } = await createTempStorage());
      const result = await getMediaBuffer(storage, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("deleteMedia", () => {
    it("removes file from storage and DB row", async () => {
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const waMediaId = `wa-del-${Date.now()}`;

      const record = await saveMedia(testDb, storage, {
        tenantId: tenant.id,
        waMediaId,
        buffer: Buffer.from("to-delete"),
        mimeType: "image/gif",
      });

      const deleted = await deleteMedia(testDb, storage, waMediaId);
      expect(deleted).toBe(true);

      // DB row gone
      const found = await getMediaByWaId(testDb, waMediaId);
      expect(found).toBeNull();

      // Storage gone
      const exists = await storage.exists(record.storagePath);
      expect(exists).toBe(false);
    });

    it("returns false for nonexistent media", async () => {
      ({ basePath, storage } = await createTempStorage());
      const deleted = await deleteMedia(testDb, storage, "nonexistent-delete");
      expect(deleted).toBe(false);
    });

    it("succeeds even if file is already gone from storage", async () => {
      ({ basePath, storage } = await createTempStorage());
      const tenant = await seedTenant();
      const waMediaId = `wa-gone-${Date.now()}`;

      const record = await saveMedia(testDb, storage, {
        tenantId: tenant.id,
        waMediaId,
        buffer: Buffer.from("will-vanish"),
        mimeType: "image/webp",
      });

      // Manually delete the file first
      await storage.delete(record.storagePath);

      // deleteMedia should still succeed (cleans up DB)
      const deleted = await deleteMedia(testDb, storage, waMediaId);
      expect(deleted).toBe(true);
    });
  });

  describe("storageKey", () => {
    it("returns tenant-scoped key", () => {
      const key = storageKey("tenant-123", "wa-media-456");
      expect(key).toBe("tenant-123/wa-media-456");
    });
  });
});
