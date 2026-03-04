import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { whatsappAccounts, aiConfigs, conversations, messages } from "@eddnbot/db/schema";
import {
  verifyWebhookSignature,
  verifyChallenge,
  parseWebhookPayload,
  WebhookVerificationError,
  createWhatsAppClient,
} from "@eddnbot/whatsapp";
import type { WebhookPayload, ParsedWebhookEvent } from "@eddnbot/whatsapp";
import { createAiEngine, createWhisperAdapter } from "@eddnbot/ai";
import type { AiProvider, AiEngineConfig, ThinkingConfig } from "@eddnbot/ai";
import { handleInboundMessage, type ConversationHandlerDeps } from "../services/conversation-handler";
import { trackAiTokens, trackWhatsAppMessage, checkQuota } from "../services/usage-tracker";

export interface ProcessedInboundMessage {
  whatsappAccountId: string;
  conversationId: string;
  messageType: string;
  messageContent: Record<string, unknown>;
  contactPhone: string;
  waMessageId: string;
}

const API_KEY_MAP: Record<AiProvider, "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_GEMINI_API_KEY"> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_GEMINI_API_KEY",
};

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

      // Process each event synchronously (before returning 200)
      const allProcessed: ProcessedInboundMessage[] = [];
      for (const event of events) {
        const processed = await processEvent(app, event);
        allProcessed.push(...processed);
      }

      // Return 200 immediately to Meta
      reply.code(200).send({ status: "ok" });

      // Fire-and-forget auto-replies
      if (allProcessed.length > 0) {
        const p = processAutoReplies(app, allProcessed).catch((err) => {
          app.log.error({ err }, "Auto-reply processing failed");
        });
        app.pendingAutoReplies.push(p as Promise<void>);
      }
    },
  );
}

async function processEvent(
  app: FastifyInstance,
  event: ParsedWebhookEvent,
): Promise<ProcessedInboundMessage[]> {
  const processed: ProcessedInboundMessage[] = [];

  // Find the whatsapp account for this phone number
  const [account] = await app.db
    .select()
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.phoneNumberId, event.phoneNumberId));

  if (!account) return processed; // Unknown phone number, skip

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

    processed.push({
      whatsappAccountId: account.id,
      conversationId: conv.id,
      messageType: msg.type,
      messageContent: content,
      contactPhone: msg.from,
      waMessageId: msg.id,
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

  return processed;
}

async function processAutoReplies(
  app: FastifyInstance,
  processedMessages: ProcessedInboundMessage[],
): Promise<void> {
  for (const msg of processedMessages) {
    try {
      // Load whatsapp account with auto-reply settings
      const [account] = await app.db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, msg.whatsappAccountId));

      if (!account || !account.autoReplyEnabled || !account.aiConfigId) {
        continue;
      }

      // Load AI config
      const [aiConfig] = await app.db
        .select()
        .from(aiConfigs)
        .where(
          and(eq(aiConfigs.id, account.aiConfigId), eq(aiConfigs.tenantId, account.tenantId)),
        );

      if (!aiConfig) continue;

      // Resolve provider API key
      const provider = aiConfig.provider as AiProvider;
      const envKey = API_KEY_MAP[provider];
      const apiKey = app.env[envKey];
      if (!apiKey) {
        app.log.error({ provider }, "Missing API key for auto-reply provider");
        continue;
      }

      // Build AI engine config
      const engineConfig: AiEngineConfig = {
        provider,
        model: aiConfig.model,
        apiKey,
        systemPrompt: aiConfig.systemPrompt ?? undefined,
        temperature: aiConfig.temperature ?? undefined,
        maxOutputTokens: aiConfig.maxOutputTokens ?? undefined,
        thinking: aiConfig.thinkingConfig
          ? (aiConfig.thinkingConfig as unknown as ThinkingConfig)
          : undefined,
      };

      // Build WhatsApp client
      const whatsappClient = createWhatsAppClient({
        phoneNumberId: account.phoneNumberId,
        accessToken: account.accessToken,
        apiVersion: app.env.WHATSAPP_API_VERSION,
      });

      // Build deps
      const deps: ConversationHandlerDeps = {
        db: app.db,
        whatsappClient,
        aiEngine: createAiEngine({ provider }),
        aiEngineConfig: engineConfig,
        logger: app.log,
        usageTracker: {
          trackAiTokens,
          trackWhatsAppMessage,
          checkQuota,
          redis: app.redis,
        },
        tenantId: account.tenantId,
      };

      // Add whisper if audio and OpenAI key available
      if (msg.messageType === "audio" && app.env.OPENAI_API_KEY) {
        deps.whisperAdapter = createWhisperAdapter();
        deps.whisperConfig = {
          apiKey: app.env.OPENAI_API_KEY,
          model: "whisper-1",
        };
      }

      await handleInboundMessage(deps, {
        conversationId: msg.conversationId,
        messageType: msg.messageType,
        messageContent: msg.messageContent,
        contactPhone: msg.contactPhone,
        waMessageId: msg.waMessageId,
      });
    } catch (err) {
      app.log.error({ err, waMessageId: msg.waMessageId }, "Auto-reply failed for message");
    }
  }
}
