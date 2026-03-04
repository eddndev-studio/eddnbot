import { pgTable, uuid, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const tenantQuotas = pgTable(
  "tenant_quotas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    maxAiTokensPerMonth: integer("max_ai_tokens_per_month"),
    maxWhatsappMessagesPerMonth: integer("max_whatsapp_messages_per_month"),
    maxApiRequestsPerMonth: integer("max_api_requests_per_month"),
    maxRequestsPerMinute: integer("max_requests_per_minute").notNull().default(60),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("tenant_quotas_tenant_id_uniq").on(table.tenantId)],
);
