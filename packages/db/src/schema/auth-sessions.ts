import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_sessions_token_hash_idx").on(table.tokenHash),
    index("auth_sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
    index("auth_sessions_account_id_idx").on(table.accountId),
  ],
);
