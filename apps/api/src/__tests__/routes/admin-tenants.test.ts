import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant } from "../helpers/seed";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";
const adminHeaders = { "x-admin-token": ADMIN_SECRET };

describe("admin tenant routes", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  describe("GET /admin/tenants", () => {
    it("lists all tenants", async () => {
      const app = await appPromise;
      await seedTenant({ slug: "list-test-1" });
      await seedTenant({ slug: "list-test-2" });

      const res = await app.inject({
        method: "GET",
        url: "/api/admin/tenants",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().tenants.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by search", async () => {
      const app = await appPromise;
      await seedTenant({ slug: "search-unique", name: "UniqueSearchName" });

      const res = await app.inject({
        method: "GET",
        url: "/api/admin/tenants?search=UniqueSearch",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().tenants.length).toBeGreaterThanOrEqual(1);
      expect(res.json().tenants[0].name).toBe("UniqueSearchName");
    });

    it("filters by active status", async () => {
      const app = await appPromise;
      await seedTenant({ slug: "inactive-filter", isActive: false });

      const res = await app.inject({
        method: "GET",
        url: "/api/admin/tenants?active=false",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const inactive = res.json().tenants;
      expect(inactive.every((t: { isActive: boolean }) => !t.isActive)).toBe(true);
    });
  });

  describe("GET /admin/tenants/:tenantId", () => {
    it("returns tenant detail", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "detail-test" });

      const res = await app.inject({
        method: "GET",
        url: `/api/admin/tenants/${tenant.id}`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(tenant.id);
    });

    it("returns 404 for non-existent tenant", async () => {
      const app = await appPromise;
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/tenants/00000000-0000-0000-0000-000000000000",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /admin/tenants/:tenantId", () => {
    it("updates tenant name", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "patch-test" });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/admin/tenants/${tenant.id}`,
        headers: adminHeaders,
        payload: { name: "Updated Name" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe("Updated Name");
    });

    it("can deactivate a tenant", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "deactivate-test" });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/admin/tenants/${tenant.id}`,
        headers: adminHeaders,
        payload: { isActive: false },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().isActive).toBe(false);
    });

    it("returns 404 for non-existent tenant", async () => {
      const app = await appPromise;
      const res = await app.inject({
        method: "PATCH",
        url: "/api/admin/tenants/00000000-0000-0000-0000-000000000000",
        headers: adminHeaders,
        payload: { name: "Nope" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /admin/tenants/:tenantId", () => {
    it("deletes a tenant and returns 204", async () => {
      const app = await appPromise;
      const tenant = await seedTenant({ slug: "delete-test" });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/admin/tenants/${tenant.id}`,
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent tenant", async () => {
      const app = await appPromise;
      const res = await app.inject({
        method: "DELETE",
        url: "/api/admin/tenants/00000000-0000-0000-0000-000000000000",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
