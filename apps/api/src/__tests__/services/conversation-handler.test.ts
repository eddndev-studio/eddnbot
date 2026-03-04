import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { messages } from "@eddnbot/db/schema";
import { testDb } from "../helpers/test-db";
import { testClient } from "../helpers/test-db";
import {
  seedTenant,
  seedWhatsAppAccount,
  seedConversation,
  seedAiConfig,
} from "../helpers/seed";
import {
  handleInboundMessage,
  DEFAULT_CONTEXT_WINDOW,
  type ConversationHandlerDeps,
  type InboundMessageInput,
} from "../../services/conversation-handler";
import type { AiProviderAdapter, AiEngineConfig, TranscriptionAdapter, TranscriptionConfig } from "@eddnbot/ai";
import type { WhatsAppAdapter } from "@eddnbot/whatsapp";

function createMockWhatsAppClient(): WhatsAppAdapter {
  return {
    sendMessage: vi.fn(async () => ({
      messaging_product: "whatsapp" as const,
      contacts: [{ input: "123", wa_id: "123" }],
      messages: [{ id: "wamid.reply001" }],
    })),
    markAsRead: vi.fn(async () => {}),
    getMediaUrl: vi.fn(async () => ({
      url: "https://lookaside.fbsbx.com/media/audio.ogg",
      mime_type: "audio/ogg",
      sha256: "abc123",
      file_size: 1000,
      id: "media-id-1",
    })),
    downloadMedia: vi.fn(async () => ({
      buffer: Buffer.from("fake-audio-data"),
      mimeType: "audio/ogg",
    })),
  };
}

function createMockAiEngine(): AiProviderAdapter {
  return {
    chat: vi.fn(async () => ({
      content: "AI response text",
      usage: { inputTokens: 10, outputTokens: 20 },
      finishReason: "stop",
    })),
  };
}

function createMockWhisper(): TranscriptionAdapter {
  return {
    transcribe: vi.fn(async () => ({
      text: "transcribed audio text",
    })),
  };
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};

const baseAiConfig: AiEngineConfig = {
  provider: "openai",
  model: "gpt-4o",
  apiKey: "sk-test",
  systemPrompt: "You are a helpful assistant.",
};

const whisperConfig: TranscriptionConfig = {
  apiKey: "sk-test",
  model: "whisper-1",
};

afterAll(async () => {
  await testClient.end();
});

describe("handleInboundMessage", () => {
  describe("text messages", () => {
    it("calls AI with conversation context + current message", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100001111" });

      // Seed some context messages
      await testDb.insert(messages).values({
        conversationId: conv.id,
        direction: "inbound",
        type: "text",
        content: { text: { body: "Previous question" } },
        status: "received",
      });
      await testDb.insert(messages).values({
        conversationId: conv.id,
        direction: "outbound",
        type: "text",
        content: { text: { body: "Previous answer" } },
        status: "sent",
      });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      const input: InboundMessageInput = {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Hello AI!" } },
        contactPhone: "5491100001111",
        waMessageId: "wamid.test001",
      };

      await handleInboundMessage(deps, input);

      expect(mockAi.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          { role: "user", content: "Previous question" },
          { role: "assistant", content: "Previous answer" },
          { role: "user", content: "Hello AI!" },
        ]),
        baseAiConfig,
      );
    });

    it("sends AI response as WhatsApp text to contact", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100002222" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Hi" } },
        contactPhone: "5491100002222",
        waMessageId: "wamid.test002",
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        type: "text",
        to: "5491100002222",
        text: { body: "AI response text" },
      });
    });

    it("stores outbound message in DB with status sent", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100003333" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Test" } },
        contactPhone: "5491100003333",
        waMessageId: "wamid.test003",
      });

      const msgs = await testDb
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      const outbound = msgs.find((m) => m.direction === "outbound");
      expect(outbound).toBeDefined();
      expect(outbound!.type).toBe("text");
      expect(outbound!.status).toBe("sent");
      expect(outbound!.sentAt).toBeInstanceOf(Date);
      expect(outbound!.content).toEqual({ text: { body: "AI response text" } });
    });

    it("marks inbound as read", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100004444" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Read me" } },
        contactPhone: "5491100004444",
        waMessageId: "wamid.test004",
      });

      expect(mockClient.markAsRead).toHaveBeenCalledWith("wamid.test004");
    });

    it("respects DEFAULT_CONTEXT_WINDOW limit", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100005555" });

      // Seed 25 messages (more than DEFAULT_CONTEXT_WINDOW)
      for (let i = 0; i < 25; i++) {
        await testDb.insert(messages).values({
          conversationId: conv.id,
          direction: i % 2 === 0 ? "inbound" : "outbound",
          type: "text",
          content: { text: { body: `Message ${i}` } },
          status: i % 2 === 0 ? "received" : "sent",
        });
      }

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Latest" } },
        contactPhone: "5491100005555",
        waMessageId: "wamid.test005",
      });

      // Context should have at most DEFAULT_CONTEXT_WINDOW + 1 (current msg)
      const callArgs = vi.mocked(mockAi.chat).mock.calls[0][0];
      expect(callArgs.length).toBeLessThanOrEqual(DEFAULT_CONTEXT_WINDOW + 1);
    });

    it("maps inbound to user and outbound to assistant in context", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100006666" });

      await testDb.insert(messages).values({
        conversationId: conv.id,
        direction: "inbound",
        type: "text",
        content: { text: { body: "User msg" } },
        status: "received",
      });
      await testDb.insert(messages).values({
        conversationId: conv.id,
        direction: "outbound",
        type: "text",
        content: { text: { body: "Bot reply" } },
        status: "sent",
      });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "New" } },
        contactPhone: "5491100006666",
        waMessageId: "wamid.test006",
      });

      const callArgs = vi.mocked(mockAi.chat).mock.calls[0][0];
      const contextOnly = callArgs.slice(0, -1); // without current message
      expect(contextOnly[0].role).toBe("user");
      expect(contextOnly[1].role).toBe("assistant");
    });

    it("does NOT include system messages in ChatMessage array", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100007777" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: { ...baseAiConfig, systemPrompt: "Be helpful" },
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Hello" } },
        contactPhone: "5491100007777",
        waMessageId: "wamid.test007",
      });

      const callArgs = vi.mocked(mockAi.chat).mock.calls[0][0];
      const hasSystem = callArgs.some((m) => m.role === "system");
      expect(hasSystem).toBe(false);
    });
  });

  describe("audio messages", () => {
    it("downloads media, transcribes, uses text for AI", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100008888" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();
      const mockWhisper = createMockWhisper();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        whisperAdapter: mockWhisper,
        whisperConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "audio",
        messageContent: { audio: { id: "media-audio-123" } },
        contactPhone: "5491100008888",
        waMessageId: "wamid.test008",
      });

      expect(mockClient.getMediaUrl).toHaveBeenCalledWith("media-audio-123");
      expect(mockClient.downloadMedia).toHaveBeenCalled();
      expect(mockWhisper.transcribe).toHaveBeenCalled();
      // AI should have been called with the transcribed text
      const callArgs = vi.mocked(mockAi.chat).mock.calls[0][0];
      expect(callArgs[callArgs.length - 1].content).toBe("transcribed audio text");
    });

    it("sends AI response based on transcribed text", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100009999" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();
      const mockWhisper = createMockWhisper();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        whisperAdapter: mockWhisper,
        whisperConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "audio",
        messageContent: { audio: { id: "media-audio-456" } },
        contactPhone: "5491100009999",
        waMessageId: "wamid.test009",
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        type: "text",
        to: "5491100009999",
        text: { body: "AI response text" },
      });
    });

    it("skips when whisper deps not provided", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100010101" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        // No whisperAdapter, no whisperConfig
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "audio",
        messageContent: { audio: { id: "media-audio-789" } },
        contactPhone: "5491100010101",
        waMessageId: "wamid.test010",
      });

      expect(mockAi.chat).not.toHaveBeenCalled();
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("unsupported types", () => {
    it("skips auto-reply for image messages", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100011111" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "image",
        messageContent: { image: { id: "img-123" } },
        contactPhone: "5491100011111",
        waMessageId: "wamid.test011",
      });

      expect(mockAi.chat).not.toHaveBeenCalled();
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it("skips auto-reply for sticker messages", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100012222" });

      const mockClient = createMockWhatsAppClient();
      const mockAi = createMockAiEngine();

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: mockLogger,
      };

      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "sticker",
        messageContent: { sticker: { id: "stk-123" } },
        contactPhone: "5491100012222",
        waMessageId: "wamid.test012",
      });

      expect(mockAi.chat).not.toHaveBeenCalled();
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("catches AI errors, logs, does not throw", async () => {
      const tenant = await seedTenant();
      const account = await seedWhatsAppAccount(tenant.id);
      const conv = await seedConversation(account.id, { contactPhone: "5491100013333" });

      const mockClient = createMockWhatsAppClient();
      const mockAi: AiProviderAdapter = {
        chat: vi.fn(async () => {
          throw new Error("AI service unavailable");
        }),
      };

      const errorLogger = { info: vi.fn(), error: vi.fn() };

      const deps: ConversationHandlerDeps = {
        db: testDb,
        whatsappClient: mockClient,
        aiEngine: mockAi,
        aiEngineConfig: baseAiConfig,
        logger: errorLogger,
      };

      // Should NOT throw
      await handleInboundMessage(deps, {
        conversationId: conv.id,
        messageType: "text",
        messageContent: { text: { body: "Trigger error" } },
        contactPhone: "5491100013333",
        waMessageId: "wamid.test013",
      });

      expect(errorLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        "Auto-reply failed",
      );
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });
  });
});
