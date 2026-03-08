import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";

describe("admin rate limiting", () => {
  const appPromise = buildTestApp();

  beforeEach(async () => {
    const app = await appPromise;
    // Clear all admin rate limit keys
    const keys = await app.redis.keys("rl:admin:*");
    if (keys.length > 0) await app.redis.del(...keys);
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("allows requests under the rate limit", async () => {
    const app = await appPromise;

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/tenants",
      headers: { "x-admin-token": ADMIN_SECRET },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 429 after exceeding 10 requests per minute", async () => {
    const app = await appPromise;

    // Send 10 valid requests (the limit)
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: "GET",
        url: "/api/admin/tenants",
        headers: { "x-admin-token": ADMIN_SECRET },
      });
    }

    // 11th request should be rate limited
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/tenants",
      headers: { "x-admin-token": ADMIN_SECRET },
    });

    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("Too many requests");
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("uses timing-safe comparison (wrong-length token returns 401)", async () => {
    const app = await appPromise;

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/tenants",
      headers: { "x-admin-token": "short" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Invalid admin token");
  });

  it("locks out IP after 5 failed auth attempts", async () => {
    const app = await appPromise;

    // Send 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/admin/tenants",
        headers: { "x-admin-token": "wrong-token-that-is-definitely-invalid!!" },
      });
    }

    // Even with a valid token, the IP should now be locked out
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/tenants",
      headers: { "x-admin-token": ADMIN_SECRET },
    });

    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("Too many requests");
  });

  it("lockout key has TTL set in Redis", async () => {
    const app = await appPromise;

    // Trigger lockout
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/admin/tenants",
        headers: { "x-admin-token": "wrong-token-that-is-definitely-invalid!!" },
      });
    }

    const lockKey = await app.redis.keys("rl:admin:lock:*");
    expect(lockKey.length).toBe(1);

    const ttl = await app.redis.ttl(lockKey[0]);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });

  it("returns 401 for missing admin token", async () => {
    const app = await appPromise;

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/tenants",
    });

    expect(res.statusCode).toBe(401);
  });
});
