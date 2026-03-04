import { pgTable, uuid, varchar, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 30 }).notNull(),
    provider: varchar("provider", { length: 20 }),
    model: varchar("model", { length: 100 }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    endpoint: varchar("endpoint", { length: 255 }),
    method: varchar("method", { length: 10 }),
    statusCode: integer("status_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("usage_events_tenant_id_idx").on(table.tenantId),
    index("usage_events_tenant_type_created_idx").on(
      table.tenantId,
      table.eventType,
      table.createdAt,
    ),
    index("usage_events_created_at_idx").on(table.createdAt),
  ],
);
