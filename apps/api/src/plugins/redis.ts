import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const redis = new Redis(app.env.REDIS_URL, {
    maxRetriesPerRequest: app.env.NODE_ENV === "test" ? 1 : 3,
    lazyConnect: true,
  });

  await redis.connect();

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
});
