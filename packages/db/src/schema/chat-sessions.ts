import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { aiConfigs } from "./ai-configs";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    aiConfigId: uuid("ai_config_id").references(() => aiConfigs.id, {
      onDelete: "set null",
    }),
    externalUserId: varchar("external_user_id", { length: 255 }),
    displayName: varchar("display_name", { length: 255 }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_sessions_tenant_id_idx").on(table.tenantId),
    index("chat_sessions_token_hash_idx").on(table.tokenHash),
    index("chat_sessions_external_user_idx").on(
      table.tenantId,
      table.externalUserId,
    ),
  ],
);
