import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { whatsappAccounts } from "./whatsapp-accounts";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    whatsappAccountId: uuid("whatsapp_account_id")
      .notNull()
      .references(() => whatsappAccounts.id, { onDelete: "cascade" }),
    contactPhone: varchar("contact_phone", { length: 30 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    windowExpiresAt: timestamp("window_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_whatsapp_account_id_idx").on(table.whatsappAccountId),
    unique("conversations_account_phone_uniq").on(table.whatsappAccountId, table.contactPhone),
  ],
);
