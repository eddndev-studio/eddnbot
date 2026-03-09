import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedAccount,
  seedAccountCredentials,
  seedTenant,
  seedTenantMember,
} from "../helpers/seed";

describe("tenant member routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(email: string) {
    const account = await seedAccount({ email });
    const passwordHash = await argon2.hash("password123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "password123" },
    });

    return {
      account,
      accessToken: res.json().accessToken as string,
    };
  }

  function authHeaders(accessToken: string, tenantId: string) {
    return {
      authorization: `Bearer ${accessToken}`,
      "x-tenant-id": tenantId,
    };
  }

  describe("GET /tenants/members", () => {
    it("lists members of the tenant", async () => {
      const { account, accessToken } = await loginAs(`members-list-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `ml-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/members",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().members.length).toBe(1);
      expect(res.json().members[0].role).toBe("owner");
      expect(res.json().members[0].email).toBeDefined();
    });
  });

  describe("PATCH /tenants/members/:memberId", () => {
    it("owner can change member role to admin", async () => {
      const { account: owner, accessToken } = await loginAs(`role-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `role-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const member = await seedAccount({ email: `role-member-${Date.now()}@test.com` });
      const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().role).toBe("admin");
    });

    it("non-owner cannot change roles", async () => {
      const { account: admin, accessToken } = await loginAs(`role-adm-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `roleadm-${Date.now()}` });
      await seedTenantMember(admin.id, tenant.id, { role: "admin" });

      const member = await seedAccount({ email: `role-mbr-${Date.now()}@test.com` });
      const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("cannot set role to owner", async () => {
      const { account: owner, accessToken } = await loginAs(`role-ow2-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `roleow2-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const member = await seedAccount({ email: `role-ow2m-${Date.now()}@test.com` });
      const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
        payload: { role: "owner" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /tenants/members/:memberId", () => {
    it("owner can remove a member", async () => {
      const { account: owner, accessToken } = await loginAs(`del-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `del-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const member = await seedAccount({ email: `del-mbr-${Date.now()}@test.com` });
      const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(204);
    });

    it("member cannot remove another member", async () => {
      const { account: caller, accessToken } = await loginAs(`del-mbr1-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `delmb-${Date.now()}` });
      await seedTenantMember(caller.id, tenant.id, { role: "member" });

      const other = await seedAccount({ email: `del-mbr2-${Date.now()}@test.com` });
      const membership = await seedTenantMember(other.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("cannot remove the owner", async () => {
      const { account: admin, accessToken } = await loginAs(`del-adm-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `deladm-${Date.now()}` });
      await seedTenantMember(admin.id, tenant.id, { role: "admin" });

      const owner = await seedAccount({ email: `del-ow-${Date.now()}@test.com` });
      const membership = await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("admin cannot remove another admin", async () => {
      const { account: admin1, accessToken } = await loginAs(`del-ad1-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `delad1-${Date.now()}` });
      await seedTenantMember(admin1.id, tenant.id, { role: "admin" });

      const admin2 = await seedAccount({ email: `del-ad2-${Date.now()}@test.com` });
      const membership = await seedTenantMember(admin2.id, tenant.id, { role: "admin" });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/members/${membership.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for nonexistent member", async () => {
      const { account: owner, accessToken } = await loginAs(`del-404-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `del404-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "DELETE",
        url: "/api/tenants/members/00000000-0000-0000-0000-000000000000",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
