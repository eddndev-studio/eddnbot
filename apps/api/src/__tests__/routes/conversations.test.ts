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
    await seedConversation(account1.id, { contactName: "Acc1", contactPhone: "5491000000001" });
    await seedConversation(account2.id, { contactName: "Acc2", contactPhone: "5491000000002" });

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
    await seedConversation(account.id, { status: "active", contactName: "Active", contactPhone: "5491000000001" });
    await seedConversation(account.id, { status: "closed", contactName: "Closed", contactPhone: "5491000000002" });

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
      await seedConversation(account.id, { contactPhone: `549100000000${i}` });
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
      contactPhone: "5491000000001",
      contactName: "Older",
      updatedAt: new Date("2024-01-01"),
    });
    await seedConversation(account.id, {
      contactPhone: "5491000000002",
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

describe("GET /conversations/:id", () => {
  it("returns conversation with account info", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id, { displayPhoneNumber: "+5491155551234" });
    const conv = await seedConversation(account.id, { contactName: "Jane" });

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(conv.id);
    expect(body.contactName).toBe("Jane");
    expect(body.account.displayPhoneNumber).toBe("+5491155551234");
  });

  it("returns 404 for non-existent conversation", async () => {
    const { response } = await authedRequest(
      "GET",
      "/conversations/00000000-0000-0000-0000-000000000000",
    );

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for conversation from another tenant", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    const account2 = await seedWhatsAppAccount(tenant2.id);
    const conv = await seedConversation(account2.id);

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/conversations/00000000-0000-0000-0000-000000000000",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("GET /conversations/:id/messages", () => {
  it("returns paginated messages in chronological order", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);
    await seedMessage(conv.id, { content: { body: "First" }, createdAt: new Date("2024-01-01") });
    await seedMessage(conv.id, { content: { body: "Second" }, createdAt: new Date("2024-01-02") });
    await seedMessage(conv.id, { content: { body: "Third" }, createdAt: new Date("2024-01-03") });

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}/messages`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0].content.body).toBe("First");
    expect(body.data[2].content.body).toBe("Third");
    expect(body.pagination.total).toBe(3);
  });

  it("paginates messages", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);
    for (let i = 0; i < 5; i++) {
      await seedMessage(conv.id, { content: { body: `msg-${i}` } });
    }

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}/messages?page=2&limit=2`,
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });

  it("returns 404 for conversation from another tenant", async () => {
    const tenant1 = await seedTenant({ slug: `t1-${Date.now()}` });
    const tenant2 = await seedTenant({ slug: `t2-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant1.id);
    const account2 = await seedWhatsAppAccount(tenant2.id);
    const conv = await seedConversation(account2.id);

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}/messages`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns empty data for conversation with no messages", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}/messages`,
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("returns correct message fields", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv = await seedConversation(account.id);
    await seedMessage(conv.id, {
      direction: "outbound",
      type: "text",
      content: { body: "Hello!" },
      status: "delivered",
    });

    const response = await app.inject({
      method: "GET",
      url: `/conversations/${conv.id}/messages`,
      headers: { "x-api-key": rawKey },
    });

    const body = response.json();
    const msg = body.data[0];
    expect(msg.id).toBeDefined();
    expect(msg.direction).toBe("outbound");
    expect(msg.type).toBe("text");
    expect(msg.content.body).toBe("Hello!");
    expect(msg.status).toBe("delivered");
    expect(msg.createdAt).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/conversations/00000000-0000-0000-0000-000000000000/messages",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("GET /conversations/stats", () => {
  it("returns conversation stats for tenant", async () => {
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    const account = await seedWhatsAppAccount(tenant.id);
    const conv1 = await seedConversation(account.id, { status: "active", contactPhone: "5491000000001" });
    const conv2 = await seedConversation(account.id, { status: "closed", contactPhone: "5491000000002" });
    // Add an unread inbound message to conv1
    await seedMessage(conv1.id, { direction: "inbound" });
    // Add a read message to conv2
    await seedMessage(conv2.id, { direction: "inbound", readAt: new Date() });

    const response = await app.inject({
      method: "GET",
      url: "/conversations/stats",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(2);
    expect(body.active).toBe(1);
    expect(body.unread).toBe(1);
  });

  it("returns zero stats for empty tenant", async () => {
    const { response } = await authedRequest("GET", "/conversations/stats");

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(0);
    expect(body.active).toBe(0);
    expect(body.unread).toBe(0);
  });
});
