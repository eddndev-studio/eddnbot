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
  seedAiConfig,
  seedConversation,
  seedMessage,
} from "../helpers/seed";

describe("member access restrictions", () => {
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

  // Creates a full test scenario: owner, member with assignment, unassigned WA account
  async function setupScenario() {
    const ts = Date.now();
    const { account: owner, accessToken: ownerToken } = await loginAs(`ma-owner-${ts}@test.com`);
    const tenant = await seedTenant({ slug: `ma-${ts}` });
    await seedTenantMember(owner.id, tenant.id, { role: "owner" });

    const { account: member, accessToken: memberToken } = await loginAs(`ma-member-${ts}@test.com`);
    const membership = await seedTenantMember(member.id, tenant.id, { role: "member" });

    const assignedWa = await seedWhatsAppAccount(tenant.id, { phoneNumberId: `phone-assigned-${ts}` });
    const unassignedWa = await seedWhatsAppAccount(tenant.id, { phoneNumberId: `phone-unassigned-${ts}` });

    await seedWaAssignment(assignedWa.id, membership.id);

    return { owner, ownerToken, tenant, member, memberToken, membership, assignedWa, unassignedWa };
  }

  describe("conversations", () => {
    it("member sees only conversations for assigned WA accounts", async () => {
      const { memberToken, tenant, assignedWa, unassignedWa } = await setupScenario();

      await seedConversation(assignedWa.id, { contactPhone: "5491100001111" });
      await seedConversation(unassignedWa.id, { contactPhone: "5491100002222" });

      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.length).toBe(1);
      expect(data[0].whatsappAccountId).toBe(assignedWa.id);
    });

    it("member gets 404 for conversation on unassigned WA account", async () => {
      const { memberToken, tenant, unassignedWa } = await setupScenario();
      const conv = await seedConversation(unassignedWa.id, { contactPhone: "5491100003333" });

      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conv.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });

    it("member can access conversation on assigned WA account", async () => {
      const { memberToken, tenant, assignedWa } = await setupScenario();
      const conv = await seedConversation(assignedWa.id, { contactPhone: "5491100004444" });

      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conv.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(conv.id);
    });

    it("member gets 404 for messages on unassigned conversation", async () => {
      const { memberToken, tenant, unassignedWa } = await setupScenario();
      const conv = await seedConversation(unassignedWa.id, { contactPhone: "5491100005555" });
      await seedMessage(conv.id);

      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conv.id}/messages`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });

    it("member stats only include assigned WA accounts", async () => {
      const { memberToken, tenant, assignedWa, unassignedWa } = await setupScenario();

      await seedConversation(assignedWa.id, { contactPhone: "5491100006666" });
      await seedConversation(assignedWa.id, { contactPhone: "5491100007777" });
      await seedConversation(unassignedWa.id, { contactPhone: "5491100008888" });

      const res = await app.inject({
        method: "GET",
        url: "/api/conversations/stats",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().total).toBe(2);
    });

    it("owner sees all conversations", async () => {
      const { ownerToken, tenant, assignedWa, unassignedWa } = await setupScenario();

      await seedConversation(assignedWa.id, { contactPhone: "5491100009990" });
      await seedConversation(unassignedWa.id, { contactPhone: "5491100009991" });

      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
        headers: authHeaders(ownerToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(2);
    });

    it("member with no assignments sees empty conversations", async () => {
      const ts = Date.now();
      const { account: owner } = await loginAs(`ma-noassign-own-${ts}@test.com`);
      const tenant = await seedTenant({ slug: `ma-noassign-${ts}` });
      await seedTenantMember(owner.id, tenant.id, { role: "owner" });

      const { account: member, accessToken: memberToken } = await loginAs(`ma-noassign-mbr-${ts}@test.com`);
      await seedTenantMember(member.id, tenant.id, { role: "member" });

      const waAccount = await seedWhatsAppAccount(tenant.id, { phoneNumberId: `phone-noassign-${ts}` });
      await seedConversation(waAccount.id, { contactPhone: "5491199990000" });

      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(0);
    });
  });

  describe("AI configs", () => {
    it("member can GET ai configs", async () => {
      const { memberToken, tenant } = await setupScenario();
      await seedAiConfig(tenant.id);

      const res = await app.inject({
        method: "GET",
        url: "/api/ai/configs",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
    });

    it("member cannot POST ai configs (403)", async () => {
      const { memberToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "POST",
        url: "/api/ai/configs",
        headers: authHeaders(memberToken, tenant.id),
        payload: {
          label: "test-config",
          provider: "openai",
          model: "gpt-4o",
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("member cannot PATCH ai configs (403)", async () => {
      const { memberToken, ownerToken, tenant } = await setupScenario();
      const config = await seedAiConfig(tenant.id, { label: `cfg-patch-${Date.now()}` });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/ai/configs/${config.id}`,
        headers: authHeaders(memberToken, tenant.id),
        payload: { label: "updated" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("member cannot DELETE ai configs (403)", async () => {
      const { memberToken, tenant } = await setupScenario();
      const config = await seedAiConfig(tenant.id, { label: `cfg-del-${Date.now()}` });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/ai/configs/${config.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("owner can POST ai configs", async () => {
      const { ownerToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "POST",
        url: "/api/ai/configs",
        headers: authHeaders(ownerToken, tenant.id),
        payload: {
          label: `owner-cfg-${Date.now()}`,
          provider: "openai",
          model: "gpt-4o",
        },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe("WhatsApp accounts", () => {
    it("member sees only assigned WA accounts", async () => {
      const { memberToken, tenant, assignedWa } = await setupScenario();

      const res = await app.inject({
        method: "GET",
        url: "/api/whatsapp/accounts",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      const accounts = res.json();
      expect(accounts.length).toBe(1);
      expect(accounts[0].id).toBe(assignedWa.id);
    });

    it("member gets 404 for unassigned WA account detail", async () => {
      const { memberToken, tenant, unassignedWa } = await setupScenario();

      const res = await app.inject({
        method: "GET",
        url: `/api/whatsapp/accounts/${unassignedWa.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(404);
    });

    it("member cannot POST WA accounts (403)", async () => {
      const { memberToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "POST",
        url: "/api/whatsapp/accounts",
        headers: authHeaders(memberToken, tenant.id),
        payload: {
          phoneNumberId: `phone-new-${Date.now()}`,
          wabaId: `waba-new-${Date.now()}`,
          accessToken: "EAAx-test-token",
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("member cannot PATCH WA accounts (403)", async () => {
      const { memberToken, tenant, assignedWa } = await setupScenario();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/whatsapp/accounts/${assignedWa.id}`,
        headers: authHeaders(memberToken, tenant.id),
        payload: { displayPhoneNumber: "+1234567890" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("member cannot DELETE WA accounts (403)", async () => {
      const { memberToken, tenant, assignedWa } = await setupScenario();

      const res = await app.inject({
        method: "DELETE",
        url: `/api/whatsapp/accounts/${assignedWa.id}`,
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("owner sees all WA accounts", async () => {
      const { ownerToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "GET",
        url: "/api/whatsapp/accounts",
        headers: authHeaders(ownerToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBe(2);
    });
  });

  describe("quotas", () => {
    it("member can GET quotas", async () => {
      const { memberToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "GET",
        url: "/api/quotas",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(200);
    });

    it("member cannot PUT quotas (403)", async () => {
      const { memberToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "PUT",
        url: "/api/quotas",
        headers: authHeaders(memberToken, tenant.id),
        payload: { maxAiTokensPerMonth: 100000 },
      });

      expect(res.statusCode).toBe(403);
    });

    it("member cannot DELETE quotas (403)", async () => {
      const { memberToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "DELETE",
        url: "/api/quotas",
        headers: authHeaders(memberToken, tenant.id),
      });

      expect(res.statusCode).toBe(403);
    });

    it("owner can PUT quotas", async () => {
      const { ownerToken, tenant } = await setupScenario();

      const res = await app.inject({
        method: "PUT",
        url: "/api/quotas",
        headers: authHeaders(ownerToken, tenant.id),
        payload: { maxAiTokensPerMonth: 100000 },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
