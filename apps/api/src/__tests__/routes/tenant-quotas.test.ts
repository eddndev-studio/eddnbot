import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedTenantQuota } from "../helpers/seed";

describe("tenant-quotas routes", () => {
  describe("GET /quotas", () => {
    it("returns null when no quota configured", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);

      const res = await app.inject({
        method: "GET",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().quotas).toBeNull();

      await app.close();
    });

    it("returns quota when configured", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);
      await seedTenantQuota(tenant.id, {
        maxAiTokensPerMonth: 100000,
        maxRequestsPerMinute: 120,
      });

      const res = await app.inject({
        method: "GET",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.quotas.maxAiTokensPerMonth).toBe(100000);
      expect(body.quotas.maxRequestsPerMinute).toBe(120);

      await app.close();
    });

    it("requires auth", async () => {
      const app = await buildTestApp();

      const res = await app.inject({
        method: "GET",
        url: "/quotas",
      });

      expect(res.statusCode).toBe(401);

      await app.close();
    });
  });

  describe("PUT /quotas", () => {
    it("creates quota for tenant", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);

      const res = await app.inject({
        method: "PUT",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
        payload: {
          maxAiTokensPerMonth: 50000,
          maxWhatsappMessagesPerMonth: 500,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.maxAiTokensPerMonth).toBe(50000);
      expect(body.maxWhatsappMessagesPerMonth).toBe(500);
      expect(body.maxRequestsPerMinute).toBe(60);

      await app.close();
    });

    it("updates existing quota (upsert)", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);
      await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 10000 });

      const res = await app.inject({
        method: "PUT",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
        payload: { maxAiTokensPerMonth: 200000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().maxAiTokensPerMonth).toBe(200000);

      await app.close();
    });

    it("validates input", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);

      const res = await app.inject({
        method: "PUT",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
        payload: { maxRequestsPerMinute: -5 },
      });

      expect(res.statusCode).toBe(400);

      await app.close();
    });
  });

  describe("DELETE /quotas", () => {
    it("removes quota", async () => {
      const app = await buildTestApp();
      const tenant = await seedTenant();
      const { rawKey } = await seedApiKey(tenant.id);
      await seedTenantQuota(tenant.id);

      const res = await app.inject({
        method: "DELETE",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
      });

      expect(res.statusCode).toBe(204);

      // Verify deleted
      const getRes = await app.inject({
        method: "GET",
        url: "/quotas",
        headers: { "x-api-key": rawKey },
      });
      expect(getRes.json().quotas).toBeNull();

      await app.close();
    });
  });
});
