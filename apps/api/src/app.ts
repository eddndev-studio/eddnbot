import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { createDb, type Database } from "@eddnbot/db/client";
import type { Env } from "./env";
import { registerSensible } from "./plugins/sensible";
import { healthRoutes } from "./routes/health";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Database
  const db = createDb(env.DATABASE_URL);
  app.decorate("db", db);

  // Plugins
  await registerSensible(app);
  await app.register(cors);
  await app.register(helmet);

  // Routes
  await app.register(healthRoutes);

  return app;
}
