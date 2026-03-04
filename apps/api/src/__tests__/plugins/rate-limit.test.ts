import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedTenantQuota } from "../helpers/seed";

describe("rate-limit plugin", () => {
  it("includes rate limit headers on authenticated requests", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBeDefined();
    expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
    expect(res.headers["x-ratelimit-reset"]).toBeDefined();

    await app.close();
  });

  it("returns 429 when rate limit exceeded", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedTenantQuota(tenant.id, { maxRequestsPerMinute: 2 });

    // First 2 requests should succeed
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/ai/configs",
        headers: { "x-api-key": rawKey },
      });
      expect(res.statusCode).toBe(200);
    }

    // 3rd request should be blocked
    const res = await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("Rate limit exceeded");
    expect(res.headers["retry-after"]).toBeDefined();

    await app.close();
  });

  it("uses default 60 rpm when no quota configured", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    expect(res.headers["x-ratelimit-limit"]).toBe("60");

    await app.close();
  });

  it("skips rate limiting for unauthenticated routes", async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();

    await app.close();
  });
});
