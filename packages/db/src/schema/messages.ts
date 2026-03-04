import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    waMessageId: varchar("wa_message_id", { length: 255 }),
    direction: varchar("direction", { length: 10 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().default({}),
    status: varchar("status", { length: 20 }).notNull().default("sent"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_wa_message_id_idx").on(table.waMessageId),
  ],
);
