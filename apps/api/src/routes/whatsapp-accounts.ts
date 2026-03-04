import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { whatsappAccounts, aiConfigs } from "@eddnbot/db/schema";

const createSchema = z.object({
  phoneNumberId: z.string().min(1).max(50),
  wabaId: z.string().min(1).max(50),
  accessToken: z.string().min(1),
  displayPhoneNumber: z.string().max(30).optional(),
  webhookVerifyToken: z.string().max(255).optional(),
  aiConfigId: z.string().uuid().nullable().optional(),
  autoReplyEnabled: z.boolean().optional(),
});

const updateSchema = z.object({
  displayPhoneNumber: z.string().max(30).nullable().optional(),
  accessToken: z.string().min(1).optional(),
  webhookVerifyToken: z.string().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
  aiConfigId: z.string().uuid().nullable().optional(),
  autoReplyEnabled: z.boolean().optional(),
});

export async function whatsappAccountRoutes(app: FastifyInstance) {
  // POST /whatsapp/accounts
  app.post("/whatsapp/accounts", async (request, reply) => {
    const body = createSchema.parse(request.body);

    // Validate aiConfigId belongs to the same tenant
    if (body.aiConfigId) {
      const [cfg] = await app.db
        .select({ id: aiConfigs.id })
        .from(aiConfigs)
        .where(and(eq(aiConfigs.id, body.aiConfigId), eq(aiConfigs.tenantId, request.tenant.id)));
      if (!cfg) {
        return reply.code(422).send({ error: "AI config not found or belongs to another tenant" });
      }
    }

    try {
      const [account] = await app.db
        .insert(whatsappAccounts)
        .values({
          tenantId: request.tenant.id,
          phoneNumberId: body.phoneNumberId,
          wabaId: body.wabaId,
          accessToken: body.accessToken,
          displayPhoneNumber: body.displayPhoneNumber,
          webhookVerifyToken: body.webhookVerifyToken,
          aiConfigId: body.aiConfigId ?? undefined,
          autoReplyEnabled: body.autoReplyEnabled,
        })
        .returning();

      return reply.code(201).send(account);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ error: "Phone number ID already registered" });
      }
      throw err;
    }
  });

  // GET /whatsapp/accounts
  app.get("/whatsapp/accounts", async (request) => {
    return app.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.tenantId, request.tenant.id));
  });

  // GET /whatsapp/accounts/:accountId
  app.get("/whatsapp/accounts/:accountId", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };

    const [account] = await app.db
      .select()
      .from(whatsappAccounts)
      .where(
        and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, request.tenant.id)),
      );

    if (!account) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    return account;
  });

  // PATCH /whatsapp/accounts/:accountId
  app.patch("/whatsapp/accounts/:accountId", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    const body = updateSchema.parse(request.body);

    // Validate aiConfigId belongs to the same tenant
    if (body.aiConfigId) {
      const [cfg] = await app.db
        .select({ id: aiConfigs.id })
        .from(aiConfigs)
        .where(and(eq(aiConfigs.id, body.aiConfigId), eq(aiConfigs.tenantId, request.tenant.id)));
      if (!cfg) {
        return reply.code(422).send({ error: "AI config not found or belongs to another tenant" });
      }
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    updates.updatedAt = new Date();

    const [account] = await app.db
      .update(whatsappAccounts)
      .set(updates)
      .where(
        and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, request.tenant.id)),
      )
      .returning();

    if (!account) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    return account;
  });

  // DELETE /whatsapp/accounts/:accountId
  app.delete("/whatsapp/accounts/:accountId", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };

    const [deleted] = await app.db
      .delete(whatsappAccounts)
      .where(
        and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, request.tenant.id)),
      )
      .returning();

    if (!deleted) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    return reply.code(204).send();
  });
}
