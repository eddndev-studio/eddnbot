import Redis from "ioredis";

export const testRedis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379/1", {
  maxRetriesPerRequest: 1,
});
