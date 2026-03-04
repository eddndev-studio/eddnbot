import { loadEnv } from "./env";
import { buildApp } from "./app";

const env = loadEnv();

const app = await buildApp(env);

await app.listen({ port: env.PORT, host: env.HOST });

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`);
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
