import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const whatsappAccounts = pgTable(
  "whatsapp_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneNumberId: varchar("phone_number_id", { length: 50 }).notNull().unique(),
    wabaId: varchar("waba_id", { length: 50 }).notNull(),
    displayPhoneNumber: varchar("display_phone_number", { length: 30 }),
    accessToken: text("access_token").notNull(),
    webhookVerifyToken: varchar("webhook_verify_token", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("whatsapp_accounts_tenant_id_idx").on(table.tenantId),
  ],
);
