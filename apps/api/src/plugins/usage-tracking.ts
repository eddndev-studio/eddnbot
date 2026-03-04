import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { trackApiRequest } from "../services/usage-tracker";

export const usageTrackingPlugin = fp(async (app: FastifyInstance) => {
  app.addHook("onResponse", async (request, reply) => {
    if (request.routeOptions.config?.skipAuth) return;
    if (!request.tenant) return;

    // Fire-and-forget — don't block the response
    trackApiRequest(app.db, app.redis, request.tenant.id, {
      endpoint: request.url,
      method: request.method,
      statusCode: reply.statusCode,
    }).catch((err) => {
      app.log.error({ err }, "Failed to track API request");
    });
  });
});
