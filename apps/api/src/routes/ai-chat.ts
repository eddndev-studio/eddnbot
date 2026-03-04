import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { aiConfigs } from "@eddnbot/db/schema";
import { createAiEngine } from "@eddnbot/ai";
import type { AiProvider, AiEngineConfig, ThinkingConfig } from "@eddnbot/ai";
import { checkQuota, trackAiTokens } from "../services/usage-tracker";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  configId: z.string().uuid().optional(),
  label: z.string().optional(),
});

const API_KEY_MAP: Record<AiProvider, "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_GEMINI_API_KEY"> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_GEMINI_API_KEY",
};

export async function aiChatRoutes(app: FastifyInstance) {
  app.post("/ai/chat", async (request, reply) => {
    const body = chatSchema.parse(request.body);

    // Resolve AI config
    let config;
    if (body.configId) {
      [config] = await app.db
        .select()
        .from(aiConfigs)
        .where(
          and(eq(aiConfigs.id, body.configId), eq(aiConfigs.tenantId, request.tenant.id)),
        );
    } else {
      const label = body.label ?? "default";
      [config] = await app.db
        .select()
        .from(aiConfigs)
        .where(
          and(eq(aiConfigs.label, label), eq(aiConfigs.tenantId, request.tenant.id)),
        );
    }

    if (!config) {
      return reply.code(404).send({ error: "AI config not found" });
    }

    // Resolve provider API key
    const provider = config.provider as AiProvider;
    const envKey = API_KEY_MAP[provider];
    const apiKey = app.env[envKey];

    if (!apiKey) {
      return reply
        .code(422)
        .send({ error: `Missing API key for provider: ${provider}` });
    }

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

    // Check AI token quota
    const quotaCheck = await checkQuota(app.db, app.redis, request.tenant.id, "ai_tokens");
    if (!quotaCheck.allowed) {
      return reply.code(429).send({
        error: `Monthly ai_tokens quota exceeded (${quotaCheck.current}/${quotaCheck.limit})`,
      });
    }

    const engine = createAiEngine({ provider });
    const result = await engine.chat(body.messages, engineConfig);

    // Track AI token usage
    if (result.usage) {
      await trackAiTokens(app.db, app.redis, request.tenant.id, {
        provider,
        model: config.model,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      });
    }

    return result;
  });
}
