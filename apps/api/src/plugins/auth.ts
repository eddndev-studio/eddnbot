import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys, tenants } from "@eddnbot/db/schema";
import { hashApiKey } from "../lib/api-key-utils";

declare module "fastify" {
  interface FastifyRequest {
    tenant: typeof tenants.$inferSelect;
    apiKey: typeof apiKeys.$inferSelect;
  }
  interface FastifyContextConfig {
    skipAuth?: boolean;
    adminOnly?: boolean;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("tenant", null);
  app.decorateRequest("apiKey", null);

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config?.adminOnly) {
      const token = request.headers["x-admin-token"] as string | undefined;
      if (!token || token !== app.env.ADMIN_SECRET) {
        return reply.code(401).send({ error: "Invalid admin token" });
      }
      return;
    }

    if (request.routeOptions.config?.skipAuth) return;

    const rawKey = request.headers["x-api-key"] as string | undefined;
    if (!rawKey) {
      return reply.code(401).send({ error: "Missing API key" });
    }

    const keyHash = hashApiKey(rawKey);

    const result = await app.db
      .select()
      .from(apiKeys)
      .innerJoin(tenants, eq(apiKeys.tenantId, tenants.id))
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (result.length === 0) {
      return reply.code(401).send({ error: "Invalid API key" });
    }

    const { api_keys: key, tenants: tenant } = result[0];

    if (key.expiresAt && key.expiresAt < new Date()) {
      return reply.code(401).send({ error: "API key expired" });
    }

    if (!tenant.isActive) {
      return reply.code(403).send({ error: "Tenant is inactive" });
    }

    request.tenant = tenant;
    request.apiKey = key;
  });
});
