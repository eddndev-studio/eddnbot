import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys, tenants, chatSessions, authSessions, accounts, tenantMembers } from "@eddnbot/db/schema";
import { hashApiKey } from "../lib/api-key-utils";
import { hashSessionToken } from "../lib/session-token-utils";
import { hashToken } from "../lib/auth-token-utils";

declare module "fastify" {
  interface FastifyRequest {
    tenant: typeof tenants.$inferSelect;
    apiKey: typeof apiKeys.$inferSelect;
    chatSession: typeof chatSessions.$inferSelect | null;
    account: typeof accounts.$inferSelect | null;
  }
  interface FastifyContextConfig {
    skipAuth?: boolean;
    adminOnly?: boolean;
    sessionAuth?: boolean;
    accountAuth?: boolean;
  }
}

async function resolveAccountFromBearer(
  app: FastifyInstance,
  authHeader: string,
): Promise<typeof accounts.$inferSelect | null> {
  if (!authHeader.startsWith("Bearer ")) return null;

  const rawToken = authHeader.slice(7);
  const tokenHash = hashToken(rawToken);

  const result = await app.db
    .select()
    .from(authSessions)
    .innerJoin(accounts, eq(authSessions.accountId, accounts.id))
    .where(eq(authSessions.tokenHash, tokenHash))
    .limit(1);

  if (result.length === 0) return null;

  const { auth_sessions: session, accounts: account } = result[0];
  if (session.expiresAt < new Date()) return null;

  return account;
}

async function resolveTenantForAccount(
  app: FastifyInstance,
  accountId: string,
  tenantId: string,
): Promise<typeof tenants.$inferSelect | null> {
  const result = await app.db
    .select({ tenant: tenants })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(
      and(
        eq(tenantMembers.accountId, accountId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenants.isActive, true),
      ),
    )
    .limit(1);

  return result.length > 0 ? result[0].tenant : null;
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("tenant", null as never);
  app.decorateRequest("apiKey", null as never);
  app.decorateRequest("chatSession", null);
  app.decorateRequest("account", null);

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config?.adminOnly) {
      const token = request.headers["x-admin-token"] as string | undefined;
      if (!token || token !== app.env.ADMIN_SECRET) {
        return reply.code(401).send({ error: "Invalid admin token" });
      }
      return;
    }

    if (request.routeOptions.config?.skipAuth) return;

    // Account auth only (no tenant context needed, e.g. /auth/me)
    if (request.routeOptions.config?.accountAuth) {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: "Missing access token" });
      }

      const account = await resolveAccountFromBearer(app, authHeader);
      if (!account) {
        return reply.code(401).send({ error: "Invalid or expired access token" });
      }

      request.account = account;
      return;
    }

    // Session-based auth (Bearer token for app/chat routes)
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

    // Default: API key OR Bearer + X-Tenant-Id (dual mode for tenant routes)
    const authHeader = request.headers.authorization;
    const tenantId = request.headers["x-tenant-id"] as string | undefined;

    // Try Bearer + X-Tenant-Id first
    if (authHeader?.startsWith("Bearer ") && tenantId) {
      const account = await resolveAccountFromBearer(app, authHeader);
      if (!account) {
        return reply.code(401).send({ error: "Invalid or expired access token" });
      }

      const tenant = await resolveTenantForAccount(app, account.id, tenantId);
      if (!tenant) {
        return reply.code(403).send({ error: "Not a member of this tenant" });
      }

      request.account = account;
      request.tenant = tenant;
      return;
    }

    // Fall back to API key auth
    const rawKey = request.headers["x-api-key"] as string | undefined;
    if (!rawKey) {
      return reply.code(401).send({ error: "Missing authentication" });
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
