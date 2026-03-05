import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { tenants, whatsappAccounts, aiConfigs, apiKeys, tenantQuotas } from "@eddnbot/db/schema";

const adminConfig = { config: { adminOnly: true } };

const upsertQuotaSchema = z.object({
  maxAiTokensPerMonth: z.number().int().positive().nullable().optional(),
  maxWhatsappMessagesPerMonth: z.number().int().positive().nullable().optional(),
  maxApiRequestsPerMonth: z.number().int().positive().nullable().optional(),
  maxRequestsPerMinute: z.number().int().positive().optional(),
});

export async function adminOverviewRoutes(app: FastifyInstance) {
  // GET /admin/overview/stats — Global stats
  app.get("/admin/overview/stats", adminConfig, async () => {
    const [[tenantCount], [waCount], [aiCount], [keyCount]] = await Promise.all([
      app.db.select({ count: sql<number>`COUNT(*)` }).from(tenants),
      app.db.select({ count: sql<number>`COUNT(*)` }).from(whatsappAccounts),
      app.db.select({ count: sql<number>`COUNT(*)` }).from(aiConfigs),
      app.db.select({ count: sql<number>`COUNT(*)` }).from(apiKeys),
    ]);

    return {
      tenants: Number(tenantCount.count),
      whatsappAccounts: Number(waCount.count),
      aiConfigs: Number(aiCount.count),
      apiKeys: Number(keyCount.count),
    };
  });

  // GET /admin/tenants/:tenantId/ai-configs — AI configs for tenant
  app.get("/admin/tenants/:tenantId/ai-configs", adminConfig, async (request) => {
    const { tenantId } = request.params as { tenantId: string };

    const rows = await app.db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.tenantId, tenantId))
      .orderBy(aiConfigs.createdAt);

    return { aiConfigs: rows };
  });

  // GET /admin/tenants/:tenantId/whatsapp-accounts — WA accounts for tenant
  app.get("/admin/tenants/:tenantId/whatsapp-accounts", adminConfig, async (request) => {
    const { tenantId } = request.params as { tenantId: string };

    const rows = await app.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.tenantId, tenantId))
      .orderBy(whatsappAccounts.createdAt);

    return { whatsappAccounts: rows };
  });

  // GET /admin/tenants/:tenantId/quotas — Quotas for tenant
  app.get("/admin/tenants/:tenantId/quotas", adminConfig, async (request) => {
    const { tenantId } = request.params as { tenantId: string };

    const [quota] = await app.db
      .select()
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, tenantId));

    return { quotas: quota ?? null };
  });

  // PUT /admin/tenants/:tenantId/quotas — Upsert quotas for tenant
  app.put("/admin/tenants/:tenantId/quotas", adminConfig, async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = upsertQuotaSchema.parse(request.body);

    const [quota] = await app.db
      .insert(tenantQuotas)
      .values({ tenantId, ...body })
      .onConflictDoUpdate({
        target: tenantQuotas.tenantId,
        set: { ...body, updatedAt: new Date() },
      })
      .returning();

    return quota;
  });
}
