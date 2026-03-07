import { pgTable, uuid, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { tenants } from "./tenants";

export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tenant_members_account_tenant_uq").on(table.accountId, table.tenantId),
    index("tenant_members_account_id_idx").on(table.accountId),
    index("tenant_members_tenant_id_idx").on(table.tenantId),
  ],
);
