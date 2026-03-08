import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, lt } from "drizzle-orm";
import { aiConfigs, chatMessages, chatSessions } from "@eddnbot/db/schema";
import { createAiEngine } from "@eddnbot/ai";
import type { AiProvider, AiEngineConfig, ThinkingConfig, ChatMessage } from "@eddnbot/ai";
import { checkQuota, trackAiTokens } from "../../services/usage-tracker";

const DEFAULT_CONTEXT_WINDOW = 20;

const API_KEY_MAP: Record<
  AiProvider,
  "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_GEMINI_API_KEY"
> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_GEMINI_API_KEY",
};

const chatInputSchema = z.object({
  content: z.string().min(1).max(32000),
});

const messagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

async function resolveAiConfig(app: FastifyInstance, session: typeof chatSessions.$inferSelect) {
  if (session.aiConfigId) {
    const [config] = await app.db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.id, session.aiConfigId));
    return config ?? null;
  }

  // Fall back to tenant default config
  const [config] = await app.db
    .select()
    .from(aiConfigs)
    .where(
      and(
        eq(aiConfigs.tenantId, session.tenantId),
        eq(aiConfigs.label, "default"),
      ),
    );
  return config ?? null;
}

async function loadSessionContext(
  app: FastifyInstance,
  sessionId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const rows = await app.db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  rows.reverse();

  return rows.map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content,
  }));
}

export async function appChatRoutes(app: FastifyInstance) {
  // Send message + stream AI response via SSE
  app.post(
    "/app/chat",
    { config: { sessionAuth: true } },
    async (request, reply) => {
      const session = request.chatSession!;
      const body = chatInputSchema.parse(request.body);

      // Resolve AI config
      const config = await resolveAiConfig(app, session);
      if (!config) {
        return reply.code(422).send({ error: "No AI config available for this session" });
      }

      const provider = config.provider as AiProvider;
      const apiKey = app.env[API_KEY_MAP[provider]];
      if (!apiKey) {
        return reply
          .code(422)
          .send({ error: `Missing API key for provider: ${provider}` });
      }

      // Check quota
      const quotaCheck = await checkQuota(
        app.db,
        app.redis,
        request.tenant.id,
        "ai_tokens",
      );
      if (!quotaCheck.allowed) {
        return reply.code(429).send({
          error: `Monthly ai_tokens quota exceeded (${quotaCheck.current}/${quotaCheck.limit})`,
        });
      }

      // Store user message
      await app.db.insert(chatMessages).values({
        sessionId: session.id,
        role: "user",
        content: body.content,
      });

      // Load context
      const contextMessages = await loadSessionContext(
        app,
        session.id,
        DEFAULT_CONTEXT_WINDOW,
      );

      // Build engine config
      const engineConfig: AiEngineConfig = {
        provider,
        model: config.model,
        apiKey,
        systemPrompt: config.systemPrompt ?? undefined,
        temperature: config.temperature ?? undefined,
        maxOutputTokens: config.maxOutputTokens ?? undefined,
        thinking: config.thinkingConfig
          ? (config.thinkingConfig as unknown as ThinkingConfig)
          : undefined,
      };

      // Hijack response so Fastify doesn't interfere with raw streaming
      reply.hijack();

      // Stream response via SSE
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      // Send keepalive comments to prevent proxies (Cloudflare) from closing
      reply.raw.write(":ok\n\n");
      const keepalive = setInterval(() => {
        if (!request.raw.destroyed) reply.raw.write(":\n\n");
      }, 1000);

      const engine = createAiEngine({ provider });
      let fullContent = "";
      let thinkingContent = "";
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        for await (const chunk of engine.chatStream(contextMessages, engineConfig)) {
          if (request.raw.destroyed) break;

          switch (chunk.type) {
            case "text":
              fullContent += chunk.content ?? "";
              reply.raw.write(`event: text\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`);
              break;

            case "thinking":
              thinkingContent += chunk.content ?? "";
              reply.raw.write(`event: thinking\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`);
              break;

            case "usage":
              if (chunk.usage?.inputTokens) inputTokens = chunk.usage.inputTokens;
              if (chunk.usage?.outputTokens) outputTokens = chunk.usage.outputTokens;
              reply.raw.write(`event: usage\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
              break;

            case "done": {
              // Store assistant message
              const [saved] = await app.db
                .insert(chatMessages)
                .values({
                  sessionId: session.id,
                  role: "assistant",
                  content: fullContent,
                  thinkingContent: thinkingContent || null,
                  inputTokens: inputTokens || null,
                  outputTokens: outputTokens || null,
                })
                .returning({ id: chatMessages.id });

              // Track token usage
              if (inputTokens > 0 || outputTokens > 0) {
                trackAiTokens(app.db, app.redis, request.tenant.id, {
                  provider,
                  model: config.model,
                  inputTokens,
                  outputTokens,
                }).catch((err) => {
                  app.log.error({ err }, "Failed to track AI tokens for app chat");
                });
              }

              reply.raw.write(
                `event: done\ndata: ${JSON.stringify({ messageId: saved.id })}\n\n`,
              );
              break;
            }
          }
        }
      } catch (err) {
        app.log.error({ err }, "Streaming error in app chat");
        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({ error: "Streaming failed" })}\n\n`,
        );
      }

      clearInterval(keepalive);
      reply.raw.end();
    },
  );

  // Get message history (cursor-based pagination)
  app.get(
    "/app/chat/messages",
    { config: { sessionAuth: true } },
    async (request) => {
      const session = request.chatSession!;
      const query = messagesQuerySchema.parse(request.query);
      const limit = query.limit ?? 50;

      let cursorCondition;
      if (query.cursor) {
        const [cursorMsg] = await app.db
          .select({ createdAt: chatMessages.createdAt })
          .from(chatMessages)
          .where(eq(chatMessages.id, query.cursor));

        if (cursorMsg) {
          cursorCondition = lt(chatMessages.createdAt, cursorMsg.createdAt);
        }
      }

      const rows = await app.db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(
          cursorCondition
            ? and(eq(chatMessages.sessionId, session.id), cursorCondition)
            : eq(chatMessages.sessionId, session.id),
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      if (hasMore) rows.pop();

      rows.reverse();

      return {
        messages: rows.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? rows[0]?.id : undefined,
      };
    },
  );

  // Temporary SSE test endpoint (no auth)
  app.all(
    "/app/chat/test-sse",
    { config: { skipAuth: true } },
    async (request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      reply.raw.write(":ok\n\n");

      let i = 0;
      const iv = setInterval(() => {
        i++;
        if (i <= 5) {
          reply.raw.write(`event: text\ndata: ${JSON.stringify({ content: `chunk ${i} ` })}\n\n`);
        } else {
          clearInterval(iv);
          reply.raw.write(`event: done\ndata: ${JSON.stringify({ messageId: "test" })}\n\n`);
          reply.raw.end();
        }
      }, 500);
    },
  );
}
