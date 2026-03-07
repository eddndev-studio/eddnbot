import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys, tenants, chatSessions } from "@eddnbot/db/schema";
import { hashApiKey } from "../lib/api-key-utils";
import { hashSessionToken } from "../lib/session-token-utils";

declare module "fastify" {
  interface FastifyRequest {
    tenant: typeof tenants.$inferSelect;
    apiKey: typeof apiKeys.$inferSelect;
    chatSession: typeof chatSessions.$inferSelect | null;
  }
  interface FastifyContextConfig {
    skipAuth?: boolean;
    adminOnly?: boolean;
    sessionAuth?: boolean;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("tenant", null);
  app.decorateRequest("apiKey", null);
  app.decorateRequest("chatSession", null);

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config?.adminOnly) {
      const token = request.headers["x-admin-token"] as string | undefined;
      if (!token || token !== app.env.ADMIN_SECRET) {
        return reply.code(401).send({ error: "Invalid admin token" });
      }
      return;
    }

    if (request.routeOptions.config?.skipAuth) return;

    // Session-based auth (Bearer token for app routes)
    if (request.routeOptions.config?.sessionAuth) {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Missing session token" });
      }

      const rawToken = authHeader.slice(7);
      const tokenHash = hashSessionToken(rawToken);

      const result = await app.db
        .select()
        .from(chatSessions)
        .innerJoin(tenants, eq(chatSessions.tenantId, tenants.id))
        .where(eq(chatSessions.tokenHash, tokenHash))
        .limit(1);

      if (result.length === 0) {
        return reply.code(401).send({ error: "Invalid session token" });
      }

      const { chat_sessions: session, tenants: tenant } = result[0];

      if (session.status !== "active") {
        return reply.code(401).send({ error: "Session is no longer active" });
      }

      if (session.expiresAt < new Date()) {
        return reply.code(401).send({ error: "Session expired" });
      }

      if (!tenant.isActive) {
        return reply.code(403).send({ error: "Tenant is inactive" });
      }

      request.chatSession = session;
      request.tenant = tenant;
      return;
    }

    // API key auth (tenant routes)
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
