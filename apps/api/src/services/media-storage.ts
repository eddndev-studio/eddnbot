import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { createReadStream, type ReadStream } from "node:fs";
import { dirname } from "node:path";
import { eq } from "drizzle-orm";
import { media } from "@eddnbot/db/schema";
import type { Database } from "@eddnbot/db/client";

const DEFAULT_STORAGE_PATH = "/data/media";

export interface SaveMediaParams {
  tenantId: string;
  waMediaId: string;
  messageId?: string;
  buffer: Buffer;
  mimeType: string;
  originalFilename?: string;
}

export interface MediaRecord {
  id: string;
  tenantId: string;
  waMediaId: string;
  messageId: string | null;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  originalFilename: string | null;
  createdAt: Date;
}

export function getStoragePath(basePath: string, waMediaId: string): string {
  return `${basePath}/${waMediaId}`;
}

export function resolveBasePath(env?: { MEDIA_STORAGE_PATH?: string }): string {
  return env?.MEDIA_STORAGE_PATH ?? DEFAULT_STORAGE_PATH;
}

export async function saveMedia(
  db: Database,
  basePath: string,
  params: SaveMediaParams,
): Promise<MediaRecord> {
  const filePath = getStoragePath(basePath, params.waMediaId);

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  // Write file to disk
  await writeFile(filePath, params.buffer);

  // Insert metadata into DB (skip if duplicate)
  const [row] = await db
    .insert(media)
    .values({
      tenantId: params.tenantId,
      waMediaId: params.waMediaId,
      messageId: params.messageId ?? null,
      mimeType: params.mimeType,
      fileSize: params.buffer.length,
      storagePath: filePath,
      originalFilename: params.originalFilename ?? null,
    })
    .onConflictDoNothing({ target: media.waMediaId })
    .returning();

  // If conflict (duplicate), return existing record
  if (!row) {
    const existing = await getMediaByWaId(db, params.waMediaId);
    if (!existing) {
      throw new Error(`Media record not found after conflict: ${params.waMediaId}`);
    }
    return existing;
  }

  return row;
}

export async function getMediaByWaId(
  db: Database,
  waMediaId: string,
): Promise<MediaRecord | null> {
  const [row] = await db
    .select()
    .from(media)
    .where(eq(media.waMediaId, waMediaId))
    .limit(1);

  return row ?? null;
}

export function getMediaStream(storagePath: string): ReadStream {
  return createReadStream(storagePath);
}

export async function getMediaBuffer(storagePath: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(storagePath);
}

export async function deleteMedia(
  db: Database,
  waMediaId: string,
): Promise<boolean> {
  const record = await getMediaByWaId(db, waMediaId);
  if (!record) return false;

  // Delete file (ignore if already gone)
  try {
    await unlink(record.storagePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Delete DB row
  await db.delete(media).where(eq(media.waMediaId, waMediaId));

  return true;
}

export async function mediaFileExists(storagePath: string): Promise<boolean> {
  try {
    await stat(storagePath);
    return true;
  } catch {
    return false;
  }
}
