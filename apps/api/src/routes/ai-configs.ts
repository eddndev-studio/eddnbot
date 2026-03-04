import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { aiConfigs } from "@eddnbot/db/schema";

const providerEnum = z.enum(["openai", "anthropic", "gemini"]);

const createAiConfigSchema = z.object({
  label: z.string().min(1).max(100).default("default"),
  provider: providerEnum,
  model: z.string().min(1).max(100),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  thinkingConfig: z.record(z.unknown()).optional(),
});

const updateAiConfigSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  provider: providerEnum.optional(),
  model: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxOutputTokens: z.number().int().positive().nullable().optional(),
  thinkingConfig: z.record(z.unknown()).nullable().optional(),
});

export async function aiConfigRoutes(app: FastifyInstance) {
  // POST /ai/configs
  app.post("/ai/configs", async (request, reply) => {
    const body = createAiConfigSchema.parse(request.body);

    try {
      const [config] = await app.db
        .insert(aiConfigs)
        .values({
          tenantId: request.tenant.id,
          label: body.label,
          provider: body.provider,
          model: body.model,
          systemPrompt: body.systemPrompt,
          temperature: body.temperature,
          maxOutputTokens: body.maxOutputTokens,
          thinkingConfig: body.thinkingConfig as Record<string, unknown>,
        })
        .returning();

      return reply.code(201).send(config);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ error: "Config with this label already exists for tenant" });
      }
      throw err;
    }
  });

  // GET /ai/configs
  app.get("/ai/configs", async (request) => {
    const configs = await app.db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.tenantId, request.tenant.id));

    return configs;
  });

  // GET /ai/configs/:configId
  app.get("/ai/configs/:configId", async (request, reply) => {
    const { configId } = request.params as { configId: string };

    const [config] = await app.db
      .select()
      .from(aiConfigs)
      .where(and(eq(aiConfigs.id, configId), eq(aiConfigs.tenantId, request.tenant.id)));

    if (!config) {
      return reply.code(404).send({ error: "AI config not found" });
    }

    return config;
  });

  // PATCH /ai/configs/:configId
  app.patch("/ai/configs/:configId", async (request, reply) => {
    const { configId } = request.params as { configId: string };
    const body = updateAiConfigSchema.parse(request.body);

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    updates.updatedAt = new Date();

    const [config] = await app.db
      .update(aiConfigs)
      .set(updates)
      .where(and(eq(aiConfigs.id, configId), eq(aiConfigs.tenantId, request.tenant.id)))
      .returning();

    if (!config) {
      return reply.code(404).send({ error: "AI config not found" });
    }

    return config;
  });

  // DELETE /ai/configs/:configId
  app.delete("/ai/configs/:configId", async (request, reply) => {
    const { configId } = request.params as { configId: string };

    const [deleted] = await app.db
      .delete(aiConfigs)
      .where(and(eq(aiConfigs.id, configId), eq(aiConfigs.tenantId, request.tenant.id)))
      .returning();

    if (!deleted) {
      return reply.code(404).send({ error: "AI config not found" });
    }

    return reply.code(204).send();
  });
}
