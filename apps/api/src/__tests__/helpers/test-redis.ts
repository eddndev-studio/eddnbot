import Redis from "ioredis";

export const testRedis = new Redis("redis://localhost:6379/1", {
  maxRetriesPerRequest: 1,
});
