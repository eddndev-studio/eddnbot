import { eq } from "drizzle-orm";
import { media } from "@eddnbot/db/schema";
import type { Database } from "@eddnbot/db/client";
import type { StorageAdapter } from "./storage";

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

/** Build a logical storage key from tenant and media IDs. */
export function storageKey(tenantId: string, waMediaId: string): string {
  return `${tenantId}/${waMediaId}`;
}

export async function saveMedia(
  db: Database,
  storage: StorageAdapter,
  params: SaveMediaParams,
): Promise<MediaRecord> {
  const key = storageKey(params.tenantId, params.waMediaId);

  // Write to object storage
  await storage.put(key, params.buffer, params.mimeType);

  // Insert metadata into DB (skip if duplicate)
  const [row] = await db
    .insert(media)
    .values({
      tenantId: params.tenantId,
      waMediaId: params.waMediaId,
      messageId: params.messageId ?? null,
      mimeType: params.mimeType,
      fileSize: params.buffer.length,
      storagePath: key,
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

export async function getMediaBuffer(
  storage: StorageAdapter,
  key: string,
): Promise<Buffer | null> {
  return storage.get(key);
}

export async function deleteMedia(
  db: Database,
  storage: StorageAdapter,
  waMediaId: string,
): Promise<boolean> {
  const record = await getMediaByWaId(db, waMediaId);
  if (!record) return false;

  await storage.delete(record.storagePath);
  await db.delete(media).where(eq(media.waMediaId, waMediaId));

  return true;
}
