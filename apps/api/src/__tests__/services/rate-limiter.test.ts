import { describe, it, expect } from "vitest";
import { testRedis } from "../helpers/test-redis";
import { checkRateLimit } from "../../services/rate-limiter";

describe("checkRateLimit", () => {
  it("allows requests under limit", async () => {
    const result = await checkRateLimit(testRedis, "tenant-1", 10);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.resetAt).toBeGreaterThan(0);
  });

  it("blocks requests over limit", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(testRedis, "tenant-2", 5);
    }

    const result = await checkRateLimit(testRedis, "tenant-2", 5);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", async () => {
    const r1 = await checkRateLimit(testRedis, "tenant-3", 3);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(testRedis, "tenant-3", 3);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(testRedis, "tenant-3", 3);
    expect(r3.remaining).toBe(0);
  });

  it("defaults to 60 rpm when limit is null", async () => {
    const result = await checkRateLimit(testRedis, "tenant-4", null);
    expect(result.limit).toBe(60);
    expect(result.remaining).toBe(59);
  });

  it("isolates different tenants", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(testRedis, "tenant-a", 3);
    }

    const resultA = await checkRateLimit(testRedis, "tenant-a", 3);
    expect(resultA.allowed).toBe(false);

    const resultB = await checkRateLimit(testRedis, "tenant-b", 3);
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(2);
  });

  it("sets TTL on the key", async () => {
    await checkRateLimit(testRedis, "tenant-ttl", 10);

    const keys = await testRedis.keys("rl:tenant-ttl:*");
    expect(keys).toHaveLength(1);

    const ttl = await testRedis.ttl(keys[0]);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });
});
