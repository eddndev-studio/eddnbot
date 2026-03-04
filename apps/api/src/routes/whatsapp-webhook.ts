import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { whatsappAccounts, conversations, messages } from "@eddnbot/db/schema";
import {
  verifyWebhookSignature,
  verifyChallenge,
  parseWebhookPayload,
  WebhookVerificationError,
} from "@eddnbot/whatsapp";
import type { WebhookPayload, ParsedWebhookEvent } from "@eddnbot/whatsapp";

export async function whatsappWebhookRoutes(app: FastifyInstance) {
  // GET /whatsapp/webhook — Meta challenge verification
  app.get(
    "/whatsapp/webhook",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      const mode = query["hub.mode"];
      const token = query["hub.verify_token"];
      const challenge = query["hub.challenge"];

      const verifyToken = app.env.WHATSAPP_VERIFY_TOKEN;
      if (!verifyToken) {
        return reply.code(403).send({ error: "Webhook verification not configured" });
      }

      try {
        const result = verifyChallenge(mode, token, challenge, verifyToken);
        return reply.type("text/plain").send(result);
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          return reply.code(403).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // POST /whatsapp/webhook — Incoming events from Meta
  app.post(
    "/whatsapp/webhook",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const appSecret = app.env.WHATSAPP_APP_SECRET;
      if (!appSecret) {
        return reply.code(401).send({ error: "Webhook not configured" });
      }

      // Verify signature using raw body
      const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;
      const signature = request.headers["x-hub-signature-256"] as string | undefined;

      if (!rawBody || !signature || !verifyWebhookSignature(rawBody.toString(), signature, appSecret)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      const payload = request.body as WebhookPayload;
      const events = parseWebhookPayload(payload);

      // Process each event in background (return 200 immediately to Meta is fine after processing)
      for (const event of events) {
        await processEvent(app, event);
      }

      return reply.code(200).send({ status: "ok" });
    },
  );
}

async function processEvent(app: FastifyInstance, event: ParsedWebhookEvent) {
  // Find the whatsapp account for this phone number
  const [account] = await app.db
    .select()
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.phoneNumberId, event.phoneNumberId));

  if (!account) return; // Unknown phone number, skip

  // Handle inbound messages
  for (const msg of event.messages) {
    const contact = event.contacts.find((c) => c.wa_id === msg.from);

    // Upsert conversation
    const [conv] = await app.db
      .insert(conversations)
      .values({
        whatsappAccountId: account.id,
        contactPhone: msg.from,
        contactName: contact?.profile.name ?? null,
      })
      .onConflictDoUpdate({
        target: [conversations.whatsappAccountId, conversations.contactPhone],
        set: {
          contactName: contact?.profile.name ?? undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Check for duplicate message (idempotency)
    if (msg.id) {
      const [existing] = await app.db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.waMessageId, msg.id));

      if (existing) continue; // Skip duplicate
    }

    // Store the message
    const content: Record<string, unknown> = {};
    if (msg.text) content.text = msg.text;
    if (msg.image) content.image = msg.image;
    if (msg.document) content.document = msg.document;
    if (msg.audio) content.audio = msg.audio;
    if (msg.video) content.video = msg.video;
    if (msg.location) content.location = msg.location;
    if (msg.reaction) content.reaction = msg.reaction;
    if (msg.interactive) content.interactive = msg.interactive;
    if (msg.button) content.button = msg.button;
    if (msg.sticker) content.sticker = msg.sticker;

    await app.db.insert(messages).values({
      conversationId: conv.id,
      waMessageId: msg.id,
      direction: "inbound",
      type: msg.type,
      content,
      status: "received",
    });
  }

  // Handle status updates
  for (const status of event.statuses) {
    const updates: Record<string, unknown> = { status: status.status };

    if (status.status === "delivered") {
      updates.deliveredAt = new Date();
    } else if (status.status === "read") {
      updates.readAt = new Date();
    }

    await app.db
      .update(messages)
      .set(updates)
      .where(eq(messages.waMessageId, status.id));
  }
}
