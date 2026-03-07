import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { whatsappAccounts } from "@eddnbot/db/schema";
import { createTemplateClient, WhatsAppApiError } from "@eddnbot/whatsapp";

const createSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
  language: z.string().min(2).max(10),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  components: z
    .array(
      z.object({
        type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
        format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
        text: z.string().optional(),
        buttons: z.array(z.record(z.unknown())).optional(),
      }),
    )
    .min(1),
});

async function resolveAccount(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { accountId } = request.params as { accountId: string };

  const [account] = await app.db
    .select()
    .from(whatsappAccounts)
    .where(
      and(
        eq(whatsappAccounts.id, accountId),
        eq(whatsappAccounts.tenantId, request.tenant.id),
      ),
    );

  if (!account) {
    reply.code(404).send({ error: "WhatsApp account not found" });
    return null;
  }

  return account;
}

export async function whatsappTemplateRoutes(app: FastifyInstance) {
  // GET /whatsapp/accounts/:accountId/templates
  app.get("/whatsapp/accounts/:accountId/templates", async (request, reply) => {
    const account = await resolveAccount(app, request, reply);
    if (!account) return;

    const { name, status, category } = request.query as {
      name?: string;
      status?: string;
      category?: string;
    };

    const client = createTemplateClient({
      wabaId: account.wabaId,
      accessToken: account.accessToken,
    });

    try {
      const templates = await client.listTemplates({
        name: name || undefined,
        status: (status as "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED") || undefined,
        category: (category as "MARKETING" | "UTILITY" | "AUTHENTICATION") || undefined,
      });
      return templates;
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // POST /whatsapp/accounts/:accountId/templates
  app.post("/whatsapp/accounts/:accountId/templates", async (request, reply) => {
    const account = await resolveAccount(app, request, reply);
    if (!account) return;

    const body = createSchema.parse(request.body);

    const client = createTemplateClient({
      wabaId: account.wabaId,
      accessToken: account.accessToken,
    });

    try {
      const result = await client.createTemplate(body);
      return reply.code(201).send(result);
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // DELETE /whatsapp/accounts/:accountId/templates/:templateName
  app.delete("/whatsapp/accounts/:accountId/templates/:templateName", async (request, reply) => {
    const account = await resolveAccount(app, request, reply);
    if (!account) return;

    const { templateName } = request.params as { accountId: string; templateName: string };

    const client = createTemplateClient({
      wabaId: account.wabaId,
      accessToken: account.accessToken,
    });

    try {
      await client.deleteTemplate(templateName);
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
