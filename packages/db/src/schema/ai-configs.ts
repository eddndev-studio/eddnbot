import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const aiConfigs = pgTable(
  "ai_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull().default("default"),
    provider: varchar("provider", { length: 20 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    systemPrompt: text("system_prompt"),
    temperature: real("temperature"),
    maxOutputTokens: integer("max_output_tokens"),
    thinkingConfig: jsonb("thinking_config").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_configs_tenant_id_idx").on(table.tenantId),
    unique("ai_configs_tenant_label_uniq").on(table.tenantId, table.label),
  ],
);
