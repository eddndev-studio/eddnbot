import { pgTable, uuid, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { tenants } from "./tenants";

export const tenantInvitations = pgTable(
  "tenant_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenant_invitations_token_hash_idx").on(table.tokenHash),
    index("tenant_invitations_tenant_id_idx").on(table.tenantId),
    index("tenant_invitations_email_idx").on(table.email),
  ],
);
