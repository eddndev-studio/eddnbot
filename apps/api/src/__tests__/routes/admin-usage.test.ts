import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedUsageEvent } from "../helpers/seed";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";
const adminHeaders = { "x-admin-token": ADMIN_SECRET };

describe("admin usage routes", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  describe("GET /admin/usage", () => {
    it("returns global usage with tenant breakdown", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "usage-global" });
      await seedUsageEvent(tenant.id, {
        eventType: "ai_tokens",
        provider: "openai",
        inputTokens: 100,
        outputTokens: 50,
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/usage",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.month).toBeDefined();
      expect(body.totals).toBeDefined();
      expect(body.totals.aiTokens).toBeGreaterThanOrEqual(150);
      expect(body.tenants).toBeDefined();
      expect(Array.isArray(body.tenants)).toBe(true);
    });
  });

  describe("GET /admin/usage/:tenantId", () => {
    it("returns usage for a specific tenant", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "usage-single" });
      await seedUsageEvent(tenant.id, {
        eventType: "ai_tokens",
        provider: "openai",
        inputTokens: 200,
        outputTokens: 100,
      });
      await seedUsageEvent(tenant.id, {
        eventType: "whatsapp_message",
      });

      const res = await app.inject({
        method: "GET",
        url: `/admin/usage/${tenant.id}`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.tenantId).toBe(tenant.id);
      expect(body.aiTokens.total).toBe(300);
      expect(body.whatsappMessages).toBe(1);
    });
  });
});
