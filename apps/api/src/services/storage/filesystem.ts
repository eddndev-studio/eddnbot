import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageAdapter } from "./types";

export function createFilesystemStorage(basePath: string): StorageAdapter {
  return {
    async put(key, data) {
      const filePath = join(basePath, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, data);
    },

    async get(key) {
      try {
        return await readFile(join(basePath, key));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },

    async delete(key) {
      try {
        await unlink(join(basePath, key));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    },

    async exists(key) {
      try {
        await stat(join(basePath, key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
