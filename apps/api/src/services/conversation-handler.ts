import { eq, desc } from "drizzle-orm";
import { messages } from "@eddnbot/db/schema";
import type { Database } from "@eddnbot/db/client";
import type {
  AiProviderAdapter,
  AiEngineConfig,
  ChatMessage,
  TranscriptionAdapter,
  TranscriptionConfig,
} from "@eddnbot/ai";
import type { WhatsAppAdapter } from "@eddnbot/whatsapp";
import type Redis from "ioredis";
import type { trackAiTokens, trackWhatsAppMessage, checkQuota } from "./usage-tracker";

export interface UsageTrackerDeps {
  trackAiTokens: typeof trackAiTokens;
  trackWhatsAppMessage: typeof trackWhatsAppMessage;
  checkQuota: typeof checkQuota;
  redis: Redis;
}

export interface ConversationHandlerDeps {
  db: Database;
  whatsappClient: WhatsAppAdapter;
  aiEngine: AiProviderAdapter;
  aiEngineConfig: AiEngineConfig;
  whisperAdapter?: TranscriptionAdapter;
  whisperConfig?: TranscriptionConfig;
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  usageTracker?: UsageTrackerDeps;
  tenantId?: string;
}

export interface InboundMessageInput {
  conversationId: string;
  messageType: string;
  messageContent: Record<string, unknown>;
  contactPhone: string;
  waMessageId: string;
}

export const DEFAULT_CONTEXT_WINDOW = 20;

export async function handleInboundMessage(
  deps: ConversationHandlerDeps,
  input: InboundMessageInput,
): Promise<void> {
  const { db, whatsappClient, aiEngine, aiEngineConfig, logger } = deps;

  try {
    // 1. Determine text from the message
    let userText: string | undefined;

    if (input.messageType === "text") {
      const textContent = input.messageContent as { text?: { body?: string } };
      userText = textContent.text?.body;
    } else if (input.messageType === "audio") {
      if (!deps.whisperAdapter || !deps.whisperConfig) {
        logger.info("Audio message received but whisper not configured, skipping auto-reply");
        return;
      }

      const audioContent = input.messageContent as { audio?: { id?: string } };
      const mediaId = audioContent.audio?.id;
      if (!mediaId) {
        logger.info("Audio message has no media ID, skipping");
        return;
      }

      const mediaInfo = await whatsappClient.getMediaUrl(mediaId);
      const { buffer } = await whatsappClient.downloadMedia(mediaInfo.url);
      const transcription = await deps.whisperAdapter.transcribe(
        buffer,
        `audio.ogg`,
        deps.whisperConfig,
      );
      userText = transcription.text;
    } else {
      logger.info({ type: input.messageType }, "Unsupported message type for auto-reply, skipping");
      return;
    }

    if (!userText) {
      logger.info("Could not extract text from message, skipping auto-reply");
      return;
    }

    // 2. Load conversation context
    const contextMessages = await loadConversationContext(
      db,
      input.conversationId,
      DEFAULT_CONTEXT_WINDOW,
    );

    // 3. Build ChatMessage array (context + current message)
    const chatMessages: ChatMessage[] = [
      ...contextMessages,
      { role: "user", content: userText },
    ];

    // 4. Check AI quota if tracker present
    if (deps.usageTracker && deps.tenantId) {
      const quotaCheck = await deps.usageTracker.checkQuota(
        db, deps.usageTracker.redis, deps.tenantId, "ai_tokens",
      );
      if (!quotaCheck.allowed) {
        logger.info({ tenantId: deps.tenantId }, "AI token quota exceeded, skipping auto-reply");
        return;
      }
    }

    // 5. Call AI engine
    const aiResponse = await aiEngine.chat(chatMessages, aiEngineConfig);

    // Track AI tokens
    if (deps.usageTracker && deps.tenantId && aiResponse.usage) {
      await deps.usageTracker.trackAiTokens(
        db, deps.usageTracker.redis, deps.tenantId, {
          provider: aiEngineConfig.provider,
          model: aiEngineConfig.model,
          inputTokens: aiResponse.usage.inputTokens ?? 0,
          outputTokens: aiResponse.usage.outputTokens ?? 0,
        },
      );
    }

    // 6. Send response via WhatsApp
    await whatsappClient.sendMessage({
      type: "text",
      to: input.contactPhone,
      text: { body: aiResponse.content },
    });

    // Track WhatsApp message
    if (deps.usageTracker && deps.tenantId) {
      await deps.usageTracker.trackWhatsAppMessage(
        db, deps.usageTracker.redis, deps.tenantId,
      );
    }

    // 7. Store outbound message in DB
    await db.insert(messages).values({
      conversationId: input.conversationId,
      direction: "outbound",
      type: "text",
      content: { text: { body: aiResponse.content } },
      status: "sent",
      sentAt: new Date(),
    });

    // 7. Mark inbound as read
    await whatsappClient.markAsRead(input.waMessageId);
  } catch (err) {
    logger.error({ err, waMessageId: input.waMessageId }, "Auto-reply failed");
  }
}

export async function loadConversationContext(
  db: Database,
  conversationId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const rows = await db
    .select({
      direction: messages.direction,
      type: messages.type,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Reverse for chronological order
  rows.reverse();

  return rows.map((row) => ({
    role: row.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: extractTextContent(row.type, row.content),
  }));
}

function extractTextContent(
  type: string,
  content: Record<string, unknown> | null,
): string {
  if (!content) return `[${type}]`;
  if (type === "text") {
    const textObj = content.text as { body?: string } | undefined;
    return textObj?.body ?? `[${type}]`;
  }
  return `[${type}]`;
}
