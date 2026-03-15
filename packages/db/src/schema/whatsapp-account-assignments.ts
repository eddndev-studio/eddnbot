import {
  pgTable,
  uuid,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { whatsappAccounts } from "./whatsapp-accounts";
import { tenantMembers } from "./tenant-members";
import { accounts } from "./accounts";

export const whatsappAccountAssignments = pgTable(
  "whatsapp_account_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    whatsappAccountId: uuid("whatsapp_account_id")
      .notNull()
      .references(() => whatsappAccounts.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => tenantMembers.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by")
      .references(() => accounts.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("wa_assignments_account_member_uq").on(table.whatsappAccountId, table.memberId),
    index("wa_assignments_whatsapp_account_id_idx").on(table.whatsappAccountId),
    index("wa_assignments_member_id_idx").on(table.memberId),
  ],
);
