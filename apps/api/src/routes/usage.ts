import type { FastifyInstance } from "fastify";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { usageEvents, tenantQuotas } from "@eddnbot/db/schema";

export async function usageRoutes(app: FastifyInstance) {
  // GET /usage?month=YYYY-MM — Monthly usage summary
  app.get("/usage", async (request) => {
    const query = request.query as Record<string, string>;
    const now = new Date();
    const month =
      query.month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    const tenantId = request.tenant.id;

    // AI tokens aggregation
    const aiTokensRows = await app.db
      .select({
        provider: usageEvents.provider,
        total: sql<number>`COALESCE(SUM(${usageEvents.inputTokens}) + SUM(${usageEvents.outputTokens}), 0)`,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.tenantId, tenantId),
          eq(usageEvents.eventType, "ai_tokens"),
          gte(usageEvents.createdAt, monthStart),
          lt(usageEvents.createdAt, nextMonth),
        ),
      )
      .groupBy(usageEvents.provider);

    const byProvider: Record<string, number> = {};
    let totalAiTokens = 0;
    for (const row of aiTokensRows) {
      const t = Number(row.total);
      if (row.provider) {
        byProvider[row.provider] = t;
      }
      totalAiTokens += t;
    }

    // WhatsApp messages count
    const [waResult] = await app.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.tenantId, tenantId),
          eq(usageEvents.eventType, "whatsapp_message"),
          gte(usageEvents.createdAt, monthStart),
          lt(usageEvents.createdAt, nextMonth),
        ),
      );

    // API requests count
    const [apiResult] = await app.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.tenantId, tenantId),
          eq(usageEvents.eventType, "api_request"),
          gte(usageEvents.createdAt, monthStart),
          lt(usageEvents.createdAt, nextMonth),
        ),
      );

    // Load quotas
    const [quota] = await app.db
      .select()
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, tenantId));

    return {
      month,
      aiTokens: {
        total: totalAiTokens,
        byProvider,
      },
      whatsappMessages: Number(waResult?.count ?? 0),
      apiRequests: Number(apiResult?.count ?? 0),
      quotas: quota
        ? {
            maxAiTokensPerMonth: quota.maxAiTokensPerMonth,
            maxWhatsappMessagesPerMonth: quota.maxWhatsappMessagesPerMonth,
            maxApiRequestsPerMonth: quota.maxApiRequestsPerMonth,
            maxRequestsPerMinute: quota.maxRequestsPerMinute,
          }
        : null,
    };
  });
}
