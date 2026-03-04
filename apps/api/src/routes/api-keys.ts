import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys } from "@eddnbot/db/schema";
import { generateApiKey } from "../lib/api-key-utils";

const createApiKeySchema = z.object({
  scopes: z.array(z.string()).default([]),
  expiresAt: z.coerce.date().optional(),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    "/tenants/:tenantId/api-keys",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const { tenantId } = request.params as { tenantId: string };
      const body = createApiKeySchema.parse(request.body);

      const { rawKey, keyHash, keyPrefix } = generateApiKey();

      const [apiKey] = await app.db
        .insert(apiKeys)
        .values({
          tenantId,
          keyHash,
          keyPrefix,
          scopes: body.scopes,
          expiresAt: body.expiresAt,
        })
        .returning();

      return reply.code(201).send({ ...apiKey, rawKey });
    },
  );

  app.delete(
    "/tenants/:tenantId/api-keys/:keyId",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const { tenantId, keyId } = request.params as { tenantId: string; keyId: string };

      const [revoked] = await app.db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
        .returning();

      if (!revoked) {
        return reply.code(404).send({ error: "API key not found" });
      }

      return reply.code(200).send(revoked);
    },
  );
}
