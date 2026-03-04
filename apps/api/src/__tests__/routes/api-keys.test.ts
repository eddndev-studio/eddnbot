import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey } from "../helpers/seed";

describe("api-key routes", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  describe("POST /tenants/:tenantId/api-keys", () => {
    it("creates an API key and returns 201 with rawKey", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-create" });

      const res = await app.inject({
        method: "POST",
        url: `/tenants/${tenant.id}/api-keys`,
        payload: { scopes: ["read"] },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.rawKey).toMatch(/^ek_live_/);
      expect(body.keyPrefix).toBeDefined();
      expect(body.keyHash).toBeDefined();
      expect(body.tenantId).toBe(tenant.id);
      expect(body.scopes).toEqual(["read"]);
    });

    it("creates an API key with default empty scopes", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-default-scopes" });

      const res = await app.inject({
        method: "POST",
        url: `/tenants/${tenant.id}/api-keys`,
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().scopes).toEqual([]);
    });

    it("creates an API key with expiration", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-expires" });
      const expiresAt = new Date("2030-01-01").toISOString();

      const res = await app.inject({
        method: "POST",
        url: `/tenants/${tenant.id}/api-keys`,
        payload: { expiresAt },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().expiresAt).toBeDefined();
    });

    it("does not require auth (skipAuth)", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-no-auth" });

      const res = await app.inject({
        method: "POST",
        url: `/tenants/${tenant.id}/api-keys`,
        payload: {},
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe("DELETE /tenants/:tenantId/api-keys/:keyId", () => {
    it("revokes an API key and returns 200", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-revoke" });
      const { apiKey } = await seedApiKey(tenant.id);

      const res = await app.inject({
        method: "DELETE",
        url: `/tenants/${tenant.id}/api-keys/${apiKey.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().revokedAt).toBeDefined();
    });

    it("returns 404 for non-existent key", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-404" });

      const res = await app.inject({
        method: "DELETE",
        url: `/tenants/${tenant.id}/api-keys/00000000-0000-0000-0000-000000000000`,
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when revoking an already revoked key", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "ak-double-revoke" });
      const { apiKey } = await seedApiKey(tenant.id, { revokedAt: new Date() });

      const res = await app.inject({
        method: "DELETE",
        url: `/tenants/${tenant.id}/api-keys/${apiKey.id}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
