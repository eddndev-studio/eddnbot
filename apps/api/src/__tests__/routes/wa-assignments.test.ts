import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedAccount,
  seedAccountCredentials,
  seedTenant,
  seedTenantMember,
  seedWhatsAppAccount,
  seedWaAssignment,
} from "../helpers/seed";

describe("wa-assignments routes", () => {
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

  describe("POST /tenants/wa-assignments", () => {
    it("owner can assign WA account to a member", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-assign-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const memberAccount = await seedAccount({ email: `wa-assign-mbr-${Date.now()}@test.com` });
      const membership = await seedTenantMember(memberAccount.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: membership.id,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().whatsappAccountId).toBe(waAccount.id);
      expect(res.json().memberId).toBe(membership.id);
      expect(res.json().assignedBy).toBe(owner.id);
    });

    it("admin can assign WA account to a member", async () => {
      const { accessToken } = await loginAs(`wa-assign-adm-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-adm-${Date.now()}` });
      const adminAccount = await seedAccount({ email: `wa-adm-helper-${Date.now()}@test.com` });
      await seedTenantMember(adminAccount.id, tenant.id, { role: "admin" });

      // Login as the admin
      const adminLogin = await loginAs(`wa-assign-adm2-${Date.now()}@test.com`);
      await seedTenantMember(adminLogin.account.id, tenant.id, { role: "admin" });

      const memberAccount = await seedAccount({ email: `wa-assign-mbr2-${Date.now()}@test.com` });
      const membership = await seedTenantMember(memberAccount.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(adminLogin.accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: membership.id,
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it("member cannot create assignments (403)", async () => {
      const { account: member, accessToken } = await loginAs(`wa-assign-m-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-m-${Date.now()}` });
      await seedTenantMember(member.id, tenant.id, { role: "member" });

      const otherMember = await seedAccount({ email: `wa-assign-m2-${Date.now()}@test.com` });
      const otherMembership = await seedTenantMember(otherMember.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: otherMembership.id,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("cannot assign to owner (422)", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-assign-to-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-to-own-${Date.now()}` });
      const ownerMembership = await seedTenantMember(owner.id, tenant.id, { role: "owner" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: ownerMembership.id,
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it("cannot assign to admin (422)", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-assign-to-adm-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-to-adm-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const admin = await seedAccount({ email: `wa-assign-tgt-adm-${Date.now()}@test.com` });
      const adminMembership = await seedTenantMember(admin.id, tenant.id, { role: "admin" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: adminMembership.id,
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it("duplicate assignment returns 409", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-assign-dup-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-dup-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const memberAccount = await seedAccount({ email: `wa-assign-dup-m-${Date.now()}@test.com` });
      const membership = await seedTenantMember(memberAccount.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);

      await seedWaAssignment(waAccount.id, membership.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: membership.id,
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it("returns 404 for WA account not in tenant", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-assign-404wa-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-assign-404wa-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const otherTenant = await seedTenant({ slug: `wa-assign-other-${Date.now()}` });
      const waAccount = await seedWhatsAppAccount(otherTenant.id);

      const memberAccount = await seedAccount({ email: `wa-assign-404wa-m-${Date.now()}@test.com` });
      const membership = await seedTenantMember(memberAccount.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
        payload: {
          whatsappAccountId: waAccount.id,
          memberId: membership.id,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /tenants/wa-assignments", () => {
    it("owner sees all assignments", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-list-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-list-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const m1 = await seedAccount({ email: `wa-list-m1-${Date.now()}@test.com` });
      const m1Membership = await seedTenantMember(m1.id, tenant.id, { role: "member" });
      const m2 = await seedAccount({ email: `wa-list-m2-${Date.now()}@test.com` });
      const m2Membership = await seedTenantMember(m2.id, tenant.id, { role: "member" });

      const waAccount = await seedWhatsAppAccount(tenant.id);
      await seedWaAssignment(waAccount.id, m1Membership.id);
      await seedWaAssignment(waAccount.id, m2Membership.id);

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().assignments.length).toBe(2);
    });

    it("member sees only own assignments", async () => {
      const { account: owner } = await loginAs(`wa-list-own-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-list-own-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const { account: member, accessToken: memberToken } = await loginAs(`wa-list-mbr-${Date.now()}@test.com`);
      const memberMembership = await seedTenantMember(member.id, tenant.id, { role: "member" });

      const otherMember = await seedAccount({ email: `wa-list-other-${Date.now()}@test.com` });
      const otherMembership = await seedTenantMember(otherMember.id, tenant.id, { role: "member" });

      const wa1 = await seedWhatsAppAccount(tenant.id, { phoneNumberId: `phone-own1-${Date.now()}` });
      const wa2 = await seedWhatsAppAccount(tenant.id, { phoneNumberId: `phone-own2-${Date.now()}` });

      await seedWaAssignment(wa1.id, memberMembership.id);
      await seedWaAssignment(wa2.id, otherMembership.id);

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/wa-assignments",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().assignments.length).toBe(1);
      expect(res.json().assignments[0].memberId).toBe(memberMembership.id);
    });
  });

  describe("DELETE /tenants/wa-assignments/:assignmentId", () => {
    it("owner can delete assignment", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-del-owner-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-del-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const memberAccount = await seedAccount({ email: `wa-del-m-${Date.now()}@test.com` });
      const membership = await seedTenantMember(memberAccount.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);
      const assignment = await seedWaAssignment(waAccount.id, membership.id);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/wa-assignments/${assignment.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(204);
    });

    it("member cannot delete assignments (403)", async () => {
      const { account: owner } = await loginAs(`wa-del-own2-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-del-mbr-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const { account: member, accessToken: memberToken } = await loginAs(`wa-del-m2-${Date.now()}@test.com`);
      const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });
      const waAccount = await seedWhatsAppAccount(tenant.id);
      const assignment = await seedWaAssignment(waAccount.id, membership.id);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/wa-assignments/${assignment.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for nonexistent assignment", async () => {
      const { account: owner, accessToken } = await loginAs(`wa-del-404-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `wa-del-404-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "DELETE",
        url: "/api/tenants/wa-assignments/00000000-0000-0000-0000-000000000000",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
