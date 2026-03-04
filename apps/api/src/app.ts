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
import { tenantRoutes } from "./routes/tenants";
import { apiKeyRoutes } from "./routes/api-keys";
import { aiConfigRoutes } from "./routes/ai-configs";
import { aiChatRoutes } from "./routes/ai-chat";
import { aiTranscribeRoutes } from "./routes/ai-transcribe";
import { whatsappAccountRoutes } from "./routes/whatsapp-accounts";
import { whatsappWebhookRoutes } from "./routes/whatsapp-webhook";
import { whatsappSendRoutes } from "./routes/whatsapp-send";
import { tenantQuotaRoutes } from "./routes/tenant-quotas";
import { usageRoutes } from "./routes/usage";

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

  // Routes
  await app.register(healthRoutes);
  await app.register(tenantRoutes);
  await app.register(apiKeyRoutes);
  await app.register(aiConfigRoutes);
  await app.register(aiChatRoutes);
  await app.register(aiTranscribeRoutes);
  await app.register(whatsappWebhookRoutes);
  await app.register(whatsappAccountRoutes);
  await app.register(whatsappSendRoutes);
  await app.register(tenantQuotaRoutes);
  await app.register(usageRoutes);

  return app;
}
