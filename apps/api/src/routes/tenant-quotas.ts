import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { tenantQuotas } from "@eddnbot/db/schema";

const upsertQuotaSchema = z.object({
  maxAiTokensPerMonth: z.number().int().positive().nullable().optional(),
  maxWhatsappMessagesPerMonth: z.number().int().positive().nullable().optional(),
  maxApiRequestsPerMonth: z.number().int().positive().nullable().optional(),
  maxRequestsPerMinute: z.number().int().positive().optional(),
});

export async function tenantQuotaRoutes(app: FastifyInstance) {
  // GET /quotas — Get tenant's quota config
  app.get("/quotas", async (request) => {
    const [quota] = await app.db
      .select()
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, request.tenant.id));

    return { quotas: quota ?? null };
  });

  // PUT /quotas — Upsert tenant quota
  app.put("/quotas", async (request) => {
    const body = upsertQuotaSchema.parse(request.body);

    const [quota] = await app.db
      .insert(tenantQuotas)
      .values({
        tenantId: request.tenant.id,
        ...body,
      })
      .onConflictDoUpdate({
        target: tenantQuotas.tenantId,
        set: {
          ...body,
          updatedAt: new Date(),
        },
      })
      .returning();

    return quota;
  });

  // DELETE /quotas — Remove quota (make unlimited)
  app.delete("/quotas", async (request, reply) => {
    await app.db
      .delete(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, request.tenant.id));

    return reply.code(204).send();
  });
}
