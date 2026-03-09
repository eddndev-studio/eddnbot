import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedAccount,
  seedAccountCredentials,
  seedTenant,
  seedTenantMember,
  seedInvitation,
} from "../helpers/seed";
import { hashToken, generateVerifyToken } from "../../lib/auth-token-utils";

describe("tenant invitation routes", () => {
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

  function accountAuthHeaders(accessToken: string) {
    return {
      authorization: `Bearer ${accessToken}`,
    };
  }

  describe("POST /tenants/invitations", () => {
    it("owner can invite a user", async () => {
      const { account, accessToken } = await loginAs(`inv-own-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `inv-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: "newuser@test.com", role: "member" },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.email).toBe("newuser@test.com");
      expect(body.role).toBe("member");
      expect(body.status).toBe("pending");
      expect(body.expiresAt).toBeDefined();
    });

    it("admin can invite a user", async () => {
      const { account, accessToken } = await loginAs(`inv-adm-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invadm-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "admin" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: "newadm@test.com" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().role).toBe("member"); // default role
    });

    it("member cannot invite", async () => {
      const { account, accessToken } = await loginAs(`inv-mbr-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invmbr-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: "someone@test.com" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("cannot invite existing member", async () => {
      const { account: owner, accessToken } = await loginAs(`inv-dup-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invdup-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const existingEmail = `existing-${Date.now()}@test.com`;
      const existing = await seedAccount({ email: existingEmail });
      await seedTenantMember(existing.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: existingEmail },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toContain("already a member");
    });

    it("cannot create duplicate pending invitation", async () => {
      const { account: owner, accessToken } = await loginAs(`inv-dup2-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invdup2-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const invEmail = `dupinv-${Date.now()}@test.com`;

      const res1 = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: invEmail },
      });
      expect(res1.statusCode).toBe(201);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: invEmail },
      });
      expect(res2.statusCode).toBe(409);
      expect(res2.json().error).toContain("pending invitation already exists");
    });

    it("normalizes email to lowercase", async () => {
      const { account, accessToken } = await loginAs(`inv-case-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invcase-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
        payload: { email: "UPPER@TEST.COM" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().email).toBe("upper@test.com");
    });
  });

  describe("GET /tenants/invitations", () => {
    it("owner can list pending invitations", async () => {
      const { account: owner, accessToken } = await loginAs(`invl-own-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invl-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });
      await seedInvitation(tenant.id, owner.id, { email: "a@test.com" });
      await seedInvitation(tenant.id, owner.id, { email: "b@test.com" });

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().invitations.length).toBe(2);
    });

    it("member cannot list invitations", async () => {
      const { account, accessToken } = await loginAs(`invl-mbr-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invlmbr-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "member" });

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/invitations",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /tenants/invitations/:invitationId", () => {
    it("owner can revoke an invitation", async () => {
      const { account: owner, accessToken } = await loginAs(`invd-own-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invd-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });
      const invitation = await seedInvitation(tenant.id, owner.id);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/invitations/${invitation.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(204);
    });

    it("member cannot revoke an invitation", async () => {
      const { account, accessToken } = await loginAs(`invd-mbr-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invdmbr-${Date.now()}` });
      await seedTenantMember(account.id, tenant.id, { role: "member" });

      const owner = await seedAccount({ email: `invd-ow2-${Date.now()}@test.com` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });
      const invitation = await seedInvitation(tenant.id, owner.id);

      const res = await app.inject({
        method: "DELETE",
        url: `/api/tenants/invitations/${invitation.id}`,
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for nonexistent invitation", async () => {
      const { account: owner, accessToken } = await loginAs(`invd-404-${Date.now()}@test.com`);
      const tenant = await seedTenant({ slug: `invd404-${Date.now()}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const res = await app.inject({
        method: "DELETE",
        url: "/api/tenants/invitations/00000000-0000-0000-0000-000000000000",
        headers: authHeaders(accessToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /tenants/invitations/pending", () => {
    it("returns pending invitations for the logged-in account", async () => {
      const { account, accessToken } = await loginAs(`invp-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `invp-inv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `invp-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });

      const rawToken = generateVerifyToken();
      await seedInvitation(tenant.id, inviter.id, {
        email: account.email,
        tokenHash: hashToken(rawToken),
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/invitations/pending",
        headers: accountAuthHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const invitations = res.json().invitations;
      expect(invitations.length).toBe(1);
      expect(invitations[0].tenantName).toBeDefined();
      expect(invitations[0].role).toBeDefined();
    });

    it("does not return expired invitations", async () => {
      const { account, accessToken } = await loginAs(`invpx-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `invpx-inv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `invpx-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });

      await seedInvitation(tenant.id, inviter.id, {
        email: account.email,
        tokenHash: hashToken(generateVerifyToken()),
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/tenants/invitations/pending",
        headers: accountAuthHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().invitations.length).toBe(0);
    });
  });

  describe("POST /tenants/invitations/accept", () => {
    it("accepts invitation and creates membership", async () => {
      const { account, accessToken } = await loginAs(`inva-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `inva-inv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `inva-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });

      const rawToken = generateVerifyToken();
      await seedInvitation(tenant.id, inviter.id, {
        email: account.email,
        role: "admin",
        tokenHash: hashToken(rawToken),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations/accept",
        headers: accountAuthHeaders(accessToken),
        payload: { token: rawToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().tenantId).toBe(tenant.id);
      expect(res.json().role).toBe("admin");
      expect(res.json().tenantName).toBeDefined();
      expect(res.json().tenantSlug).toBeDefined();
    });

    it("returns 400 for invalid token", async () => {
      const { accessToken } = await loginAs(`inva-bad-${Date.now()}@test.com`);

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations/accept",
        headers: accountAuthHeaders(accessToken),
        payload: { token: "invalid-token-value" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 403 when email does not match", async () => {
      const { accessToken } = await loginAs(`inva-wrong-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `inva-winv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `invaw-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });

      const rawToken = generateVerifyToken();
      await seedInvitation(tenant.id, inviter.id, {
        email: "someone-else@test.com",
        tokenHash: hashToken(rawToken),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations/accept",
        headers: accountAuthHeaders(accessToken),
        payload: { token: rawToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 409 if already a member", async () => {
      const { account, accessToken } = await loginAs(`inva-dup-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `inva-dinv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `invad-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });
      await seedTenantMember(account.id, tenant.id, { role: "member" });

      const rawToken = generateVerifyToken();
      await seedInvitation(tenant.id, inviter.id, {
        email: account.email,
        tokenHash: hashToken(rawToken),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations/accept",
        headers: accountAuthHeaders(accessToken),
        payload: { token: rawToken },
      });

      expect(res.statusCode).toBe(409);
    });

    it("returns 400 for expired invitation", async () => {
      const { account, accessToken } = await loginAs(`inva-exp-${Date.now()}@test.com`);
      const inviter = await seedAccount({ email: `inva-einv-${Date.now()}@test.com` });
      const tenant = await seedTenant({ slug: `invae-${Date.now()}` });
      await seedTenantMember(inviter.id, tenant.id, { role: "owner" });

      const rawToken = generateVerifyToken();
      await seedInvitation(tenant.id, inviter.id, {
        email: account.email,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/tenants/invitations/accept",
        headers: accountAuthHeaders(accessToken),
        payload: { token: rawToken },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
