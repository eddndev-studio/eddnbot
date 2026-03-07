import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedTenant,
  seedApiKey,
  seedAiConfig,
  seedWhatsAppAccount,
  seedTenantQuota,
} from "../helpers/seed";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";
const adminHeaders = { "x-admin-token": ADMIN_SECRET };

describe("admin overview routes", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  describe("GET /admin/overview/stats", () => {
    it("returns global counts", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "stats-test" });
      await seedApiKey(tenant.id);
      await seedAiConfig(tenant.id);
      await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "GET",
        url: "/api/admin/overview/stats",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.tenants).toBeGreaterThanOrEqual(1);
      expect(body.apiKeys).toBeGreaterThanOrEqual(1);
      expect(body.aiConfigs).toBeGreaterThanOrEqual(1);
      expect(body.whatsappAccounts).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /admin/tenants/:tenantId/ai-configs", () => {
    it("returns AI configs for tenant", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ai-configs-admin" });
      await seedAiConfig(tenant.id);

      const res = await app.inject({
        method: "GET",
        url: `/api/admin/tenants/${tenant.id}/ai-configs`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().aiConfigs).toHaveLength(1);
    });
  });

  describe("GET /admin/tenants/:tenantId/whatsapp-accounts", () => {
    it("returns WA accounts for tenant", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "wa-admin" });
      await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "GET",
        url: `/api/admin/tenants/${tenant.id}/whatsapp-accounts`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().whatsappAccounts).toHaveLength(1);
    });
  });

  describe("GET /admin/tenants/:tenantId/quotas", () => {
    it("returns null when no quota exists", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "quota-admin-none" });

      const res = await app.inject({
        method: "GET",
        url: `/api/admin/tenants/${tenant.id}/quotas`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().quotas).toBeNull();
    });

    it("returns quota when it exists", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "quota-admin-exists" });
      await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 100000 });

      const res = await app.inject({
        method: "GET",
        url: `/api/admin/tenants/${tenant.id}/quotas`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().quotas.maxAiTokensPerMonth).toBe(100000);
    });
  });

  describe("PUT /admin/tenants/:tenantId/quotas", () => {
    it("creates a quota", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "quota-admin-create" });

      const res = await app.inject({
        method: "PUT",
        url: `/api/admin/tenants/${tenant.id}/quotas`,
        headers: adminHeaders,
        payload: { maxAiTokensPerMonth: 50000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().maxAiTokensPerMonth).toBe(50000);
    });

    it("upserts an existing quota", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "quota-admin-upsert" });
      await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 10000 });

      const res = await app.inject({
        method: "PUT",
        url: `/api/admin/tenants/${tenant.id}/quotas`,
        headers: adminHeaders,
        payload: { maxAiTokensPerMonth: 99999 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().maxAiTokensPerMonth).toBe(99999);
    });
  });
});
