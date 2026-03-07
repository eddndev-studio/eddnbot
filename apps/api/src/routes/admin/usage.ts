import type { FastifyInstance } from "fastify";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { usageEvents, tenantQuotas, tenants } from "@eddnbot/db/schema";

const adminConfig = { config: { adminOnly: true } };

function parseMonth(query: Record<string, string>) {
  const now = new Date();
  const month =
    query.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { month, monthStart, nextMonth };
}

async function getUsageForTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: typeof import("@eddnbot/db/client").createDb extends (...args: any[]) => infer R ? R : never,
  tenantId: string,
  monthStart: Date,
  nextMonth: Date,
) {
  const aiTokensRows = await db
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
    if (row.provider) byProvider[row.provider] = t;
    totalAiTokens += t;
  }

  const [waResult] = await db
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

  const [apiResult] = await db
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

  const [quota] = await db
    .select()
    .from(tenantQuotas)
    .where(eq(tenantQuotas.tenantId, tenantId));

  return {
    aiTokens: { total: totalAiTokens, byProvider },
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
}

export async function adminUsageRoutes(app: FastifyInstance) {
  // GET /admin/usage?month=YYYY-MM — Global usage (all tenants)
  app.get("/admin/usage", adminConfig, async (request) => {
    const query = request.query as Record<string, string>;
    const { month, monthStart, nextMonth } = parseMonth(query);

    const allTenants = await app.db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug }).from(tenants);

    const tenantsUsage = await Promise.all(
      allTenants.map(async (t) => {
        const usage = await getUsageForTenant(app.db, t.id, monthStart, nextMonth);
        return { tenantId: t.id, name: t.name, slug: t.slug, ...usage };
      }),
    );

    // Aggregate totals
    let totalAiTokens = 0;
    let totalWhatsappMessages = 0;
    let totalApiRequests = 0;
    for (const tu of tenantsUsage) {
      totalAiTokens += tu.aiTokens.total;
      totalWhatsappMessages += tu.whatsappMessages;
      totalApiRequests += tu.apiRequests;
    }

    return {
      month,
      totals: {
        aiTokens: totalAiTokens,
        whatsappMessages: totalWhatsappMessages,
        apiRequests: totalApiRequests,
      },
      tenants: tenantsUsage,
    };
  });

  // GET /admin/usage/:tenantId?month=YYYY-MM — Usage for a specific tenant
  app.get("/admin/usage/:tenantId", adminConfig, async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const query = request.query as Record<string, string>;
    const { month, monthStart, nextMonth } = parseMonth(query);

    const usage = await getUsageForTenant(app.db, tenantId, monthStart, nextMonth);

    return { month, tenantId, ...usage };
  });
}
