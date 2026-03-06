import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedTenant,
  seedApiKey,
  seedWhatsAppAccount,
  seedConversation,
  seedMessage,
} from "../helpers/seed";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

async function authedRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  payload?: unknown,
) {
  const tenant = await seedTenant();
  const { rawKey } = await seedApiKey(tenant.id);
  const response = await app.inject({
    method,
    url,
    headers: { "x-api-key": rawKey },
    ...(payload ? { payload } : {}),
  });
  return { response, tenant, rawKey };
}

describe("GET /conversations", () => {
  it("returns conversations for the authenticated tenant", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id, { contactName: "John" });
    await seedMessage(conv.id, { direction: "inbound", content: { body: "Hi there" } });

    const response = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(conv.id);
    expect(body.data[0].contactName).toBe("John");
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(1);
  });

  it("returns empty list when tenant has no conversations", async () => {
    const { response } = await authedRequest("GET", "/conversations");

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("does not return conversations from other tenants", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    const account1 = await seedWhatsAppAccount(tenant1.id);
    const account2 = await seedWhatsAppAccount(tenant2.id);
    await seedConversation(account1.id, { contactName: "Mine" });
    await seedConversation(account2.id, { contactName: "Theirs" });

    const response = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contactName).toBe("Mine");
  });

  it("includes last message preview", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);
    await seedMessage(conv.id, { content: { body: "First" }, createdAt: new Date("2024-01-01") });
    await seedMessage(conv.id, { content: { body: "Last" }, createdAt: new Date("2024-01-02") });

    const response = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data[0].lastMessage).toBeDefined();
    expect(body.data[0].lastMessage.content.body).toBe("Last");
  });

  it("includes message count", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);
    await seedMessage(conv.id);
    await seedMessage(conv.id);
    await seedMessage(conv.id);

    const response = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data[0].messageCount).toBe(3);
  });

  it("filters by accountId", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account1 = await seedWhatsAppAccount(tenant.id);
    const account2 = await seedWhatsAppAccount(tenant.id);
    await seedConversation(account1.id, { contactName: "Acc1" });
    await seedConversation(account2.id, { contactName: "Acc2" });

    const response = await app.inject({
      method: "GET",
      url: `/conversations?accountId=${account1.id}`,
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contactName).toBe("Acc1");
  });

  it("filters by status", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    await seedConversation(account.id, { status: "active", contactName: "Active" });
    await seedConversation(account.id, { status: "closed", contactName: "Closed" });

    const response = await app.inject({
      method: "GET",
      url: "/conversations?status=active",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contactName).toBe("Active");
  });

  it("filters by search (contactName or contactPhone)", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    await seedConversation(account.id, { contactName: "Alice", contactPhone: "5491111111111" });
    await seedConversation(account.id, { contactName: "Bob", contactPhone: "5492222222222" });

    const response = await app.inject({
      method: "GET",
      url: "/conversations?search=Alice",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contactName).toBe("Alice");
  });

  it("paginates results", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    for (let i = 0; i < 5; i++) {
      await seedConversation(account.id);
    }

    const response = await app.inject({
      method: "GET",
      url: "/conversations?page=1&limit=2",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });

  it("sorts by updatedAt desc", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    await seedConversation(account.id, {
      contactName: "Older",
      updatedAt: new Date("2024-01-01"),
    });
    await seedConversation(account.id, {
      contactName: "Newer",
      updatedAt: new Date("2024-06-01"),
    });

    const response = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data[0].contactName).toBe("Newer");
    expect(body.data[1].contactName).toBe("Older");
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/conversations",
    });

    expect(response.statusCode).toBe(401);
  });
});
