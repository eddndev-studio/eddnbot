import { loadEnv } from "./env";
import { buildApp } from "./app";
import { runMigrations } from "@eddnbot/db";

const env = loadEnv();

const app = await buildApp(env);

app.log.info("Running database migrations...");
await runMigrations(app.db);
app.log.info("Database migrations complete");

await app.listen({ port: env.PORT, host: env.HOST });

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`);
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
