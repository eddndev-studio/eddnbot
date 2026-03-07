import { eq, desc } from "drizzle-orm";
import { messages } from "@eddnbot/db/schema";
import type { Database } from "@eddnbot/db/client";
import type {
  AiProviderAdapter,
  AiEngineConfig,
  ChatMessage,
  ContentPart,
  TranscriptionAdapter,
  TranscriptionConfig,
} from "@eddnbot/ai";
import { modelSupportsVision } from "@eddnbot/ai";
import type { WhatsAppAdapter } from "@eddnbot/whatsapp";
import type Redis from "ioredis";
import type { trackAiTokens, trackWhatsAppMessage, checkQuota } from "./usage-tracker";

export interface UsageTrackerDeps {
  trackAiTokens: typeof trackAiTokens;
  trackWhatsAppMessage: typeof trackWhatsAppMessage;
  checkQuota: typeof checkQuota;
  redis: Redis;
}

export interface MediaStorageDeps {
  getMediaBuffer(waMediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
}

export interface ConversationHandlerDeps {
  db: Database;
  whatsappClient: WhatsAppAdapter;
  aiEngine: AiProviderAdapter;
  aiEngineConfig: AiEngineConfig;
  whisperAdapter?: TranscriptionAdapter;
  whisperConfig?: TranscriptionConfig;
  mediaStorage?: MediaStorageDeps;
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
    // 1. Build user message content from inbound message
    let userContent: string | ContentPart[] | undefined;

    if (input.messageType === "text") {
      const textContent = input.messageContent as { text?: { body?: string } };
      userContent = textContent.text?.body;
    } else if (input.messageType === "audio") {
      userContent = await handleAudioMessage(deps, input);
    } else if (input.messageType === "image") {
      userContent = await handleImageMessage(deps, input);
    } else {
      logger.info({ type: input.messageType }, "Unsupported message type for auto-reply, skipping");
      return;
    }

    if (!userContent) {
      logger.info("Could not extract content from message, skipping auto-reply");
      return;
    }

    // 2. Load conversation context (text-only for history)
    const contextMessages = await loadConversationContext(
      db,
      input.conversationId,
      DEFAULT_CONTEXT_WINDOW,
    );

    // 3. Build ChatMessage array (context + current message)
    const chatMessages: ChatMessage[] = [
      ...contextMessages,
      { role: "user", content: userContent },
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

    // 8. Mark inbound as read
    await whatsappClient.markAsRead(input.waMessageId);
  } catch (err) {
    logger.error({ err, waMessageId: input.waMessageId }, "Auto-reply failed");
  }
}

async function handleAudioMessage(
  deps: ConversationHandlerDeps,
  input: InboundMessageInput,
): Promise<string | undefined> {
  if (!deps.whisperAdapter || !deps.whisperConfig) {
    deps.logger.info("Audio message received but whisper not configured, skipping auto-reply");
    return undefined;
  }

  const audioContent = input.messageContent as { audio?: { id?: string } };
  const mediaId = audioContent.audio?.id;
  if (!mediaId) {
    deps.logger.info("Audio message has no media ID, skipping");
    return undefined;
  }

  // Try reading from local storage first, fall back to Meta API download
  let buffer: Buffer;
  if (deps.mediaStorage) {
    const stored = await deps.mediaStorage.getMediaBuffer(mediaId);
    if (stored) {
      buffer = stored.buffer;
    } else {
      const mediaInfo = await deps.whatsappClient.getMediaUrl(mediaId);
      const downloaded = await deps.whatsappClient.downloadMedia(mediaInfo.url);
      buffer = downloaded.buffer;
    }
  } else {
    const mediaInfo = await deps.whatsappClient.getMediaUrl(mediaId);
    const downloaded = await deps.whatsappClient.downloadMedia(mediaInfo.url);
    buffer = downloaded.buffer;
  }

  const transcription = await deps.whisperAdapter.transcribe(
    buffer,
    "audio.ogg",
    deps.whisperConfig,
  );
  return transcription.text;
}

async function handleImageMessage(
  deps: ConversationHandlerDeps,
  input: InboundMessageInput,
): Promise<string | ContentPart[] | undefined> {
  const imageContent = input.messageContent as { image?: { id?: string; caption?: string } };
  const mediaId = imageContent.image?.id;
  const caption = imageContent.image?.caption;

  // Check if model supports vision
  const hasVision = modelSupportsVision(deps.aiEngineConfig.model);

  if (!hasVision) {
    // Fallback: describe what was sent as text
    if (caption) return `[The user sent an image with caption: "${caption}"]`;
    return "[The user sent an image]";
  }

  if (!mediaId) {
    if (caption) return `[Image] ${caption}`;
    return "[The user sent an image but media was unavailable]";
  }

  // Try reading image from local storage, fall back to Meta API
  let buffer: Buffer;
  let mimeType: string;
  if (deps.mediaStorage) {
    const stored = await deps.mediaStorage.getMediaBuffer(mediaId);
    if (stored) {
      buffer = stored.buffer;
      mimeType = stored.mimeType;
    } else {
      const mediaInfo = await deps.whatsappClient.getMediaUrl(mediaId);
      const downloaded = await deps.whatsappClient.downloadMedia(mediaInfo.url);
      buffer = downloaded.buffer;
      mimeType = downloaded.mimeType;
    }
  } else {
    const mediaInfo = await deps.whatsappClient.getMediaUrl(mediaId);
    const downloaded = await deps.whatsappClient.downloadMedia(mediaInfo.url);
    buffer = downloaded.buffer;
    mimeType = downloaded.mimeType;
  }

  const base64 = buffer.toString("base64");
  const parts: ContentPart[] = [];

  if (caption) {
    parts.push({ type: "text", text: caption });
  }
  parts.push({ type: "image", mimeType, data: base64 });

  return parts;
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
  // For media messages in context, include caption if available
  if (type === "image" || type === "video") {
    const media = content[type] as { caption?: string } | undefined;
    if (media?.caption) return `[${type}: ${media.caption}]`;
  }
  if (type === "document") {
    const doc = content.document as { filename?: string; caption?: string } | undefined;
    if (doc?.filename) return `[document: ${doc.filename}]`;
    if (doc?.caption) return `[document: ${doc.caption}]`;
  }
  return `[${type}]`;
}
