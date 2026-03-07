import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { aiConfigs, chatSessions } from "@eddnbot/db/schema";
import { generateSessionToken } from "../../lib/session-token-utils";

const DEFAULT_TTL_MINUTES = 1440; // 24 hours
const MAX_TTL_MINUTES = 43200; // 30 days

const createSessionSchema = z.object({
  externalUserId: z.string().max(255).optional(),
  displayName: z.string().max(255).optional(),
  aiConfigLabel: z.string().max(100).optional(),
  aiConfigId: z.string().uuid().optional(),
  ttlMinutes: z.number().int().min(1).max(MAX_TTL_MINUTES).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function appSessionRoutes(app: FastifyInstance) {
  // Create session (authenticated by tenant API key)
  app.post("/app/sessions", async (request, reply) => {
    const body = createSessionSchema.parse(request.body);

    // Resolve AI config
    let aiConfigId: string | null = null;
    if (body.aiConfigId) {
      const [config] = await app.db
        .select({ id: aiConfigs.id })
        .from(aiConfigs)
        .where(
          and(
            eq(aiConfigs.id, body.aiConfigId),
            eq(aiConfigs.tenantId, request.tenant.id),
          ),
        );
      if (!config) {
        return reply.code(404).send({ error: "AI config not found" });
      }
      aiConfigId = config.id;
    } else if (body.aiConfigLabel) {
      const [config] = await app.db
        .select({ id: aiConfigs.id })
        .from(aiConfigs)
        .where(
          and(
            eq(aiConfigs.label, body.aiConfigLabel),
            eq(aiConfigs.tenantId, request.tenant.id),
          ),
        );
      if (!config) {
        return reply.code(404).send({ error: "AI config not found" });
      }
      aiConfigId = config.id;
    }

    const ttlMinutes = body.ttlMinutes ?? DEFAULT_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const { rawToken, tokenHash } = generateSessionToken();

    const [session] = await app.db
      .insert(chatSessions)
      .values({
        tenantId: request.tenant.id,
        aiConfigId,
        externalUserId: body.externalUserId,
        displayName: body.displayName,
        tokenHash,
        metadata: body.metadata ?? {},
        expiresAt,
      })
      .returning({ id: chatSessions.id, createdAt: chatSessions.createdAt });

    return reply.code(201).send({
      sessionId: session.id,
      sessionToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    });
  });

  // Get session info (authenticated by session Bearer token)
  app.get(
    "/app/session",
    { config: { sessionAuth: true } },
    async (request) => {
      const session = request.chatSession!;
      return {
        sessionId: session.id,
        displayName: session.displayName,
        externalUserId: session.externalUserId,
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      };
    },
  );

  // Close session (authenticated by session Bearer token)
  app.delete(
    "/app/session",
    { config: { sessionAuth: true } },
    async (request, reply) => {
      await app.db
        .update(chatSessions)
        .set({ status: "closed" })
        .where(eq(chatSessions.id, request.chatSession!.id));

      return reply.code(204).send();
    },
  );
}
