import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, sql, desc, asc, ilike, or, gte, lte, inArray } from "drizzle-orm";
import { conversations, messages, whatsappAccounts } from "@eddnbot/db/schema";
import { resolveMemberWaFilter } from "../lib/role-utils";

const listQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function conversationRoutes(app: FastifyInstance) {
  // GET /conversations/stats — Conversation stats for dashboard
  app.get("/conversations/stats", async (request) => {
    const tenantId = request.tenant.id;

    const assignedIds = await resolveMemberWaFilter(app, request.account, tenantId);
    // Member with no assignments → zeros
    if (assignedIds !== null && assignedIds.length === 0) {
      return { total: 0, active: 0, unread: 0 };
    }

    const conditions = [eq(whatsappAccounts.tenantId, tenantId)];
    if (assignedIds !== null) {
      conditions.push(inArray(conversations.whatsappAccountId, assignedIds));
    }

    const [result] = await app.db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${conversations.status} = 'active')`,
        unread: sql<number>`COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM messages m
          WHERE m.conversation_id = ${conversations.id}
            AND m.direction = 'inbound'
            AND m.read_at IS NULL
        ))`,
      })
      .from(conversations)
      .innerJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(and(...conditions));

    return {
      total: Number(result?.total ?? 0),
      active: Number(result?.active ?? 0),
      unread: Number(result?.unread ?? 0),
    };
  });

  // GET /conversations — List conversations with filters and pagination
  app.get("/conversations", async (request) => {
    const tenantId = request.tenant.id;
    const query = listQuerySchema.parse(request.query);

    const assignedIds = await resolveMemberWaFilter(app, request.account, tenantId);
    // Member with no assignments → empty result
    if (assignedIds !== null && assignedIds.length === 0) {
      return {
        data: [],
        pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
      };
    }

    const conditions = [eq(whatsappAccounts.tenantId, tenantId)];
    if (assignedIds !== null) {
      conditions.push(inArray(conversations.whatsappAccountId, assignedIds));
    }

    if (query.accountId) {
      conditions.push(eq(conversations.whatsappAccountId, query.accountId));
    }
    if (query.status) {
      conditions.push(eq(conversations.status, query.status));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(conversations.contactName, `%${query.search}%`),
          ilike(conversations.contactPhone, `%${query.search}%`),
        )!,
      );
    }
    if (query.from) {
      conditions.push(gte(conversations.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(conversations.createdAt, new Date(query.to)));
    }

    const where = and(...conditions);

    // Count total
    const [countResult] = await app.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(conversations)
      .innerJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(where);

    const total = Number(countResult?.count ?? 0);

    // Fetch conversations with last message and message count
    const offset = (query.page - 1) * query.limit;

    const rows = await app.db
      .select({
        id: conversations.id,
        whatsappAccountId: conversations.whatsappAccountId,
        contactPhone: conversations.contactPhone,
        contactName: conversations.contactName,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        accountDisplayPhone: whatsappAccounts.displayPhoneNumber,
        accountPhoneNumberId: whatsappAccounts.phoneNumberId,
        messageCount: sql<number>`(
          SELECT COUNT(*) FROM messages m WHERE m.conversation_id = ${conversations.id}
        )`,
        unreadCount: sql<number>`(
          SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = ${conversations.id}
            AND m.direction = 'inbound'
            AND m.read_at IS NULL
        )`,
      })
      .from(conversations)
      .innerJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(where)
      .orderBy(desc(conversations.updatedAt))
      .limit(query.limit)
      .offset(offset);

    // Fetch last message for each conversation using individual subqueries
    const conversationIds = rows.map((r) => r.id);
    const lastMessages: Record<string, { content: Record<string, unknown>; direction: string; type: string; createdAt: Date }> = {};

    if (conversationIds.length > 0) {
      const idList = sql.join(conversationIds.map((id) => sql`${id}`), sql`, `);
      const lastMsgRows = await app.db.execute(sql`
        SELECT DISTINCT ON (m.conversation_id)
          m.conversation_id,
          m.content,
          m.direction,
          m.type,
          m.created_at
        FROM messages m
        WHERE m.conversation_id IN (${idList})
        ORDER BY m.conversation_id, m.created_at DESC
      `);

      for (const row of lastMsgRows) {
        const r = row as { conversation_id: string; content: Record<string, unknown>; direction: string; type: string; created_at: Date };
        lastMessages[r.conversation_id] = {
          content: r.content,
          direction: r.direction,
          type: r.type,
          createdAt: r.created_at,
        };
      }
    }

    const data = rows.map((row) => ({
      id: row.id,
      whatsappAccountId: row.whatsappAccountId,
      contactPhone: row.contactPhone,
      contactName: row.contactName,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      account: {
        displayPhoneNumber: row.accountDisplayPhone,
        phoneNumberId: row.accountPhoneNumberId,
      },
      messageCount: Number(row.messageCount),
      unreadCount: Number(row.unreadCount),
      lastMessage: lastMessages[row.id] ?? null,
    }));

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  // GET /conversations/:id — Conversation detail
  app.get("/conversations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenant.id;

    const [row] = await app.db
      .select({
        id: conversations.id,
        whatsappAccountId: conversations.whatsappAccountId,
        contactPhone: conversations.contactPhone,
        contactName: conversations.contactName,
        status: conversations.status,
        windowExpiresAt: conversations.windowExpiresAt,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        accountDisplayPhone: whatsappAccounts.displayPhoneNumber,
        accountPhoneNumberId: whatsappAccounts.phoneNumberId,
      })
      .from(conversations)
      .innerJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(and(eq(conversations.id, id), eq(whatsappAccounts.tenantId, tenantId)));

    if (!row) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    // Member WA assignment check
    const assignedIds = await resolveMemberWaFilter(app, request.account, tenantId);
    if (assignedIds !== null && !assignedIds.includes(row.whatsappAccountId)) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    return {
      id: row.id,
      whatsappAccountId: row.whatsappAccountId,
      contactPhone: row.contactPhone,
      contactName: row.contactName,
      status: row.status,
      windowExpiresAt: row.windowExpiresAt,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      account: {
        displayPhoneNumber: row.accountDisplayPhone,
        phoneNumberId: row.accountPhoneNumberId,
      },
    };
  });

  // GET /conversations/:id/messages — Messages for a conversation
  app.get("/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenant.id;
    const query = messagesQuerySchema.parse(request.query);

    // Verify conversation belongs to tenant
    const [conv] = await app.db
      .select({ id: conversations.id, whatsappAccountId: conversations.whatsappAccountId })
      .from(conversations)
      .innerJoin(whatsappAccounts, eq(conversations.whatsappAccountId, whatsappAccounts.id))
      .where(and(eq(conversations.id, id), eq(whatsappAccounts.tenantId, tenantId)));

    if (!conv) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    // Member WA assignment check
    const assignedIds = await resolveMemberWaFilter(app, request.account, tenantId);
    if (assignedIds !== null && !assignedIds.includes(conv.whatsappAccountId)) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    // Count total messages
    const [countResult] = await app.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.conversationId, id));

    const total = Number(countResult?.count ?? 0);
    const offset = (query.page - 1) * query.limit;

    const data = await app.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))
      .limit(query.limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });
}
