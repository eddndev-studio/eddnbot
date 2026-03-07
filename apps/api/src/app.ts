import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rawBody from "fastify-raw-body";
import { ZodError } from "zod";
import { createDb, type Database } from "@eddnbot/db/client";
import type { Env } from "./env";
import { registerSensible } from "./plugins/sensible";
import { authPlugin } from "./plugins/auth";
import { redisPlugin } from "./plugins/redis";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { usageTrackingPlugin } from "./plugins/usage-tracking";
import { healthRoutes } from "./routes/health";
import { aiConfigRoutes } from "./routes/ai-configs";
import { aiModelRoutes } from "./routes/ai-models";
import { aiChatRoutes } from "./routes/ai-chat";
import { aiTranscribeRoutes } from "./routes/ai-transcribe";
import { whatsappAccountRoutes } from "./routes/whatsapp-accounts";
import { whatsappWebhookRoutes } from "./routes/whatsapp-webhook";
import { whatsappSendRoutes } from "./routes/whatsapp-send";
import { whatsappTemplateRoutes } from "./routes/whatsapp-templates";
import { tenantQuotaRoutes } from "./routes/tenant-quotas";
import { conversationRoutes } from "./routes/conversations";
import { usageRoutes } from "./routes/usage";
import { adminAuthRoutes } from "./routes/admin/auth";
import { adminTenantRoutes } from "./routes/admin/tenants";
import { adminApiKeyRoutes } from "./routes/admin/api-keys";
import { adminOverviewRoutes } from "./routes/admin/overview";
import { adminUsageRoutes } from "./routes/admin/usage";
import { mediaRoutes } from "./routes/media";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    env: Env;
    pendingAutoReplies: Promise<void>[];
  }
}

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Environment & Database
  app.decorate("env", env);
  const db = createDb(env.DATABASE_URL);
  app.decorate("db", db);
  app.decorate("pendingAutoReplies", [] as Promise<void>[]);

  // Error handler
  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation error",
        details: error.flatten().fieldErrors,
      });
    }
    throw error;
  });

  // Plugins
  await registerSensible(app);
  await app.register(cors);
  await app.register(helmet);
  await app.register(multipart, { limits: { fileSize: 26 * 1024 * 1024 } });
  await app.register(rawBody, { runFirst: true });
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  await app.register(usageTrackingPlugin);

  // All routes under /api prefix
  await app.register(
    async (api) => {
      // Admin routes
      await api.register(adminAuthRoutes);
      await api.register(adminTenantRoutes);
      await api.register(adminApiKeyRoutes);
      await api.register(adminOverviewRoutes);
      await api.register(adminUsageRoutes);

      // Tenant routes
      await api.register(healthRoutes);
      await api.register(aiConfigRoutes);
      await api.register(aiModelRoutes);
      await api.register(aiChatRoutes);
      await api.register(aiTranscribeRoutes);
      await api.register(whatsappWebhookRoutes);
      await api.register(whatsappAccountRoutes);
      await api.register(whatsappSendRoutes);
      await api.register(whatsappTemplateRoutes);
      await api.register(conversationRoutes);
      await api.register(tenantQuotaRoutes);
      await api.register(usageRoutes);
      await api.register(mediaRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}
