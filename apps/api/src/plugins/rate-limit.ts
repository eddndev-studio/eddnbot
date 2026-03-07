import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { tenantQuotas } from "@eddnbot/db/schema";
import { checkRateLimit, checkSessionRateLimit } from "../services/rate-limiter";

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config?.skipAuth) return;
    if (!request.tenant) return;

    // Load tenant's rate limit config
    const [quota] = await app.db
      .select({ maxRequestsPerMinute: tenantQuotas.maxRequestsPerMinute })
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, request.tenant.id));

    // Tenant-level rate limit
    const result = await checkRateLimit(
      app.redis,
      request.tenant.id,
      quota?.maxRequestsPerMinute,
    );

    reply.header("X-RateLimit-Limit", result.limit);
    reply.header("X-RateLimit-Remaining", result.remaining);
    reply.header("X-RateLimit-Reset", result.resetAt);

    if (!result.allowed) {
      const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
      reply.header("Retry-After", retryAfter);
      return reply.code(429).send({ error: "Rate limit exceeded" });
    }

    // Per-session rate limit (stricter, prevents single user from exhausting tenant quota)
    if (request.chatSession) {
      const sessionResult = await checkSessionRateLimit(
        app.redis,
        request.chatSession.id,
      );

      reply.header("X-Session-RateLimit-Limit", sessionResult.limit);
      reply.header("X-Session-RateLimit-Remaining", sessionResult.remaining);

      if (!sessionResult.allowed) {
        const retryAfter = Math.max(1, sessionResult.resetAt - Math.floor(Date.now() / 1000));
        reply.header("Retry-After", retryAfter);
        return reply.code(429).send({ error: "Session rate limit exceeded" });
      }
    }
  });
});
