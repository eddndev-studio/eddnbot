import { describe, it, expect, afterEach } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilesystemStorage } from "../../../services/storage";

let basePath: string;

async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `fs-storage-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

afterEach(async () => {
  if (basePath) {
    await rm(basePath, { recursive: true, force: true });
  }
});

describe("createFilesystemStorage", () => {
  describe("put", () => {
    it("writes file to disk, creating directories as needed", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      await storage.put("tenant-1/media-abc", Buffer.from("hello"), "text/plain");

      const content = await readFile(join(basePath, "tenant-1", "media-abc"));
      expect(content.toString()).toBe("hello");
    });
  });

  describe("get", () => {
    it("reads file from disk", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      await storage.put("key", Buffer.from("data"), "application/octet-stream");
      const result = await storage.get("key");

      expect(result).toEqual(Buffer.from("data"));
    });

    it("returns null for missing file", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      const result = await storage.get("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("removes file from disk", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      await storage.put("to-delete", Buffer.from("bye"), "text/plain");
      await storage.delete("to-delete");

      const exists = await storage.exists("to-delete");
      expect(exists).toBe(false);
    });

    it("does not throw for missing file", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      await expect(storage.delete("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("exists", () => {
    it("returns true for existing file", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      await storage.put("check", Buffer.from("x"), "text/plain");
      expect(await storage.exists("check")).toBe(true);
    });

    it("returns false for missing file", async () => {
      basePath = await createTempDir();
      const storage = createFilesystemStorage(basePath);

      expect(await storage.exists("nope")).toBe(false);
    });
  });
});
