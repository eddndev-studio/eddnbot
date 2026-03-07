import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { messages } from "./messages";

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    waMediaId: varchar("wa_media_id", { length: 255 }).notNull(),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: integer("file_size").notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    originalFilename: varchar("original_filename", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("media_wa_media_id_unique").on(table.waMediaId),
    index("media_tenant_id_idx").on(table.tenantId),
    index("media_wa_media_id_idx").on(table.waMediaId),
  ],
);
