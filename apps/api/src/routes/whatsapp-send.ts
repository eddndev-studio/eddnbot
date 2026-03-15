import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { whatsappAccounts, conversations, messages } from "@eddnbot/db/schema";
import { createWhatsAppClient } from "@eddnbot/whatsapp";
import type { OutboundMessage, TemplateMessage } from "@eddnbot/whatsapp";
import { checkQuota, trackWhatsAppMessage } from "../services/usage-tracker";
import { resolveMemberWaFilter } from "../lib/role-utils";

const sendSchema = z.object({
  accountId: z.string().uuid(),
  to: z.string().min(1),
  type: z.string().min(1),
  text: z.object({ body: z.string(), preview_url: z.boolean().optional() }).optional(),
  image: z.record(z.unknown()).optional(),
  document: z.record(z.unknown()).optional(),
  audio: z.record(z.unknown()).optional(),
  video: z.record(z.unknown()).optional(),
  location: z.record(z.unknown()).optional(),
  reaction: z.record(z.unknown()).optional(),
  interactive: z.record(z.unknown()).optional(),
});

const sendTemplateSchema = z.object({
  accountId: z.string().uuid(),
  to: z.string().min(1),
  template: z.object({
    name: z.string().min(1),
    language: z.object({ code: z.string().min(1) }),
    components: z.array(z.unknown()).optional(),
  }),
});

export async function whatsappSendRoutes(app: FastifyInstance) {
  // POST /whatsapp/send — Send a free-form message
  app.post("/whatsapp/send", async (request, reply) => {
    const body = sendSchema.parse(request.body);

    // Verify account belongs to this tenant
    const [account] = await app.db
      .select()
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, body.accountId),
          eq(whatsappAccounts.tenantId, request.tenant.id),
        ),
      );

    if (!account) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    // Member WA assignment check
    const assignedIds = await resolveMemberWaFilter(app, request.account, request.tenant.id);
    if (assignedIds !== null && !assignedIds.includes(body.accountId)) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    // Check WhatsApp message quota
    const quotaCheck = await checkQuota(app.db, app.redis, request.tenant.id, "whatsapp_messages");
    if (!quotaCheck.allowed) {
      return reply.code(429).send({
        error: `Monthly whatsapp_messages quota exceeded (${quotaCheck.current}/${quotaCheck.limit})`,
      });
    }

    const client = createWhatsAppClient({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      apiVersion: app.env.WHATSAPP_API_VERSION,
    });

    // Build the outbound message
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId: _, ...msgFields } = body;
    const message = msgFields as unknown as OutboundMessage;

    const result = await client.sendMessage(message);
    const waMessageId = result.messages[0]?.id;

    // Upsert conversation
    const [conv] = await app.db
      .insert(conversations)
      .values({
        whatsappAccountId: account.id,
        contactPhone: body.to,
      })
      .onConflictDoUpdate({
        target: [conversations.whatsappAccountId, conversations.contactPhone],
        set: { updatedAt: new Date() },
      })
      .returning();

    // Store outbound message
    const content: Record<string, unknown> = {};
    if (body.text) content.text = body.text;
    if (body.image) content.image = body.image;
    if (body.document) content.document = body.document;
    if (body.audio) content.audio = body.audio;
    if (body.video) content.video = body.video;
    if (body.location) content.location = body.location;
    if (body.reaction) content.reaction = body.reaction;
    if (body.interactive) content.interactive = body.interactive;

    await app.db.insert(messages).values({
      conversationId: conv.id,
      waMessageId,
      direction: "outbound",
      type: body.type,
      content,
      status: "sent",
      sentAt: new Date(),
    });

    // Track WhatsApp message
    await trackWhatsAppMessage(app.db, app.redis, request.tenant.id);

    return { waMessageId, conversationId: conv.id };
  });

  // POST /whatsapp/send-template — Send a template message
  app.post("/whatsapp/send-template", async (request, reply) => {
    const body = sendTemplateSchema.parse(request.body);

    // Verify account belongs to this tenant
    const [account] = await app.db
      .select()
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, body.accountId),
          eq(whatsappAccounts.tenantId, request.tenant.id),
        ),
      );

    if (!account) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    // Member WA assignment check
    const assignedIds = await resolveMemberWaFilter(app, request.account, request.tenant.id);
    if (assignedIds !== null && !assignedIds.includes(body.accountId)) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    // Check WhatsApp message quota
    const quotaCheck = await checkQuota(app.db, app.redis, request.tenant.id, "whatsapp_messages");
    if (!quotaCheck.allowed) {
      return reply.code(429).send({
        error: `Monthly whatsapp_messages quota exceeded (${quotaCheck.current}/${quotaCheck.limit})`,
      });
    }

    const client = createWhatsAppClient({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      apiVersion: app.env.WHATSAPP_API_VERSION,
    });

    const message: TemplateMessage = {
      type: "template",
      to: body.to,
      template: body.template,
    };

    const result = await client.sendMessage(message);
    const waMessageId = result.messages[0]?.id;

    // Upsert conversation
    const [conv] = await app.db
      .insert(conversations)
      .values({
        whatsappAccountId: account.id,
        contactPhone: body.to,
      })
      .onConflictDoUpdate({
        target: [conversations.whatsappAccountId, conversations.contactPhone],
        set: { updatedAt: new Date() },
      })
      .returning();

    // Store outbound message
    await app.db.insert(messages).values({
      conversationId: conv.id,
      waMessageId,
      direction: "outbound",
      type: "template",
      content: { template: body.template } as Record<string, unknown>,
      status: "sent",
      sentAt: new Date(),
    });

    // Track WhatsApp message
    await trackWhatsAppMessage(app.db, app.redis, request.tenant.id);

    return { waMessageId, conversationId: conv.id };
  });
}
