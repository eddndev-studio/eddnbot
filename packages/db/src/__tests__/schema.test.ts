import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { testDb } from "./helpers/test-db";
import {
  tenants,
  users,
  apiKeys,
  aiConfigs,
  whatsappAccounts,
  conversations,
  messages,
} from "../schema/index";

describe("tenants", () => {
  it("inserts and queries a tenant", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    expect(tenant.id).toBeDefined();
    expect(tenant.name).toBe("Acme");
    expect(tenant.slug).toBe("acme");
    expect(tenant.isActive).toBe(true);
    expect(tenant.createdAt).toBeInstanceOf(Date);
  });

  it("enforces unique slug constraint", async () => {
    await testDb.insert(tenants).values({ name: "Acme", slug: "acme" });

    await expect(
      testDb.insert(tenants).values({ name: "Acme 2", slug: "acme" }),
    ).rejects.toThrow();
  });

  it("cascade deletes users and api_keys when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(users).values({
      tenantId: tenant.id,
      email: "user@acme.com",
      name: "Test User",
    });

    await testDb.insert(apiKeys).values({
      tenantId: tenant.id,
      keyHash: "a".repeat(64),
      keyPrefix: "ek_live_abc",
    });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remainingUsers = await testDb
      .select()
      .from(users)
      .where(eq(users.tenantId, tenant.id));
    const remainingKeys = await testDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenant.id));

    expect(remainingUsers).toHaveLength(0);
    expect(remainingKeys).toHaveLength(0);
  });
});

describe("users", () => {
  it("inserts and queries a user", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [user] = await testDb
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: "user@acme.com",
        name: "Test User",
      })
      .returning();

    expect(user.id).toBeDefined();
    expect(user.tenantId).toBe(tenant.id);
    expect(user.email).toBe("user@acme.com");
    expect(user.role).toBe("member");
  });
});

describe("apiKeys", () => {
  it("inserts and queries an api key", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [key] = await testDb
      .insert(apiKeys)
      .values({
        tenantId: tenant.id,
        keyHash: "b".repeat(64),
        keyPrefix: "ek_live_xyz",
        scopes: ["read", "write"],
      })
      .returning();

    expect(key.id).toBeDefined();
    expect(key.tenantId).toBe(tenant.id);
    expect(key.keyHash).toBe("b".repeat(64));
    expect(key.scopes).toEqual(["read", "write"]);
    expect(key.revokedAt).toBeNull();
    expect(key.expiresAt).toBeNull();
  });
});

describe("aiConfigs", () => {
  it("inserts and queries an ai config", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [config] = await testDb
      .insert(aiConfigs)
      .values({
        tenantId: tenant.id,
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: "You are a helpful assistant.",
        temperature: 0.7,
        maxOutputTokens: 1024,
        thinkingConfig: { provider: "openai", config: { effort: "medium" } },
      })
      .returning();

    expect(config.id).toBeDefined();
    expect(config.tenantId).toBe(tenant.id);
    expect(config.label).toBe("default");
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o");
    expect(config.systemPrompt).toBe("You are a helpful assistant.");
    expect(config.temperature).toBeCloseTo(0.7);
    expect(config.maxOutputTokens).toBe(1024);
    expect(config.thinkingConfig).toEqual({
      provider: "openai",
      config: { effort: "medium" },
    });
    expect(config.createdAt).toBeInstanceOf(Date);
    expect(config.updatedAt).toBeInstanceOf(Date);
  });

  it("enforces unique (tenant_id, label) constraint", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(aiConfigs).values({
      tenantId: tenant.id,
      label: "support-bot",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });

    await expect(
      testDb.insert(aiConfigs).values({
        tenantId: tenant.id,
        label: "support-bot",
        provider: "gemini",
        model: "gemini-2.5-pro",
      }),
    ).rejects.toThrow();
  });

  it("cascade deletes ai configs when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(aiConfigs).values({
      tenantId: tenant.id,
      provider: "openai",
      model: "gpt-4o",
    });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remaining = await testDb
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.tenantId, tenant.id));

    expect(remaining).toHaveLength(0);
  });
});

describe("whatsappAccounts", () => {
  it("inserts and queries a whatsapp account", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "1234567890",
        wabaId: "waba-001",
        accessToken: "EAAx...",
      })
      .returning();

    expect(account.id).toBeDefined();
    expect(account.tenantId).toBe(tenant.id);
    expect(account.phoneNumberId).toBe("1234567890");
    expect(account.wabaId).toBe("waba-001");
    expect(account.isActive).toBe(true);
    expect(account.displayPhoneNumber).toBeNull();
    expect(account.webhookVerifyToken).toBeNull();
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it("enforces unique phone_number_id constraint", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(whatsappAccounts).values({
      tenantId: tenant.id,
      phoneNumberId: "same-number",
      wabaId: "waba-001",
      accessToken: "token1",
    });

    await expect(
      testDb.insert(whatsappAccounts).values({
        tenantId: tenant.id,
        phoneNumberId: "same-number",
        wabaId: "waba-002",
        accessToken: "token2",
      }),
    ).rejects.toThrow();
  });

  it("cascade deletes when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(whatsappAccounts).values({
      tenantId: tenant.id,
      phoneNumberId: "123",
      wabaId: "waba-001",
      accessToken: "token",
    });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remaining = await testDb
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.tenantId, tenant.id));
    expect(remaining).toHaveLength(0);
  });
});

describe("conversations", () => {
  it("inserts and queries a conversation", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "123",
        wabaId: "waba-001",
        accessToken: "token",
      })
      .returning();

    const [conv] = await testDb
      .insert(conversations)
      .values({
        whatsappAccountId: account.id,
        contactPhone: "5491155551234",
        contactName: "John Doe",
      })
      .returning();

    expect(conv.id).toBeDefined();
    expect(conv.whatsappAccountId).toBe(account.id);
    expect(conv.contactPhone).toBe("5491155551234");
    expect(conv.status).toBe("active");
    expect(conv.metadata).toEqual({});
  });

  it("enforces unique (whatsapp_account_id, contact_phone)", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "123",
        wabaId: "waba-001",
        accessToken: "token",
      })
      .returning();

    await testDb.insert(conversations).values({
      whatsappAccountId: account.id,
      contactPhone: "5491155551234",
    });

    await expect(
      testDb.insert(conversations).values({
        whatsappAccountId: account.id,
        contactPhone: "5491155551234",
      }),
    ).rejects.toThrow();
  });
});

describe("messages", () => {
  it("inserts and queries a message", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "123",
        wabaId: "waba-001",
        accessToken: "token",
      })
      .returning();
    const [conv] = await testDb
      .insert(conversations)
      .values({ whatsappAccountId: account.id, contactPhone: "5491155551234" })
      .returning();

    const [msg] = await testDb
      .insert(messages)
      .values({
        conversationId: conv.id,
        waMessageId: "wamid.abc123",
        direction: "inbound",
        type: "text",
        content: { text: { body: "Hello!" } },
        status: "received",
      })
      .returning();

    expect(msg.id).toBeDefined();
    expect(msg.conversationId).toBe(conv.id);
    expect(msg.waMessageId).toBe("wamid.abc123");
    expect(msg.direction).toBe("inbound");
    expect(msg.type).toBe("text");
    expect(msg.content).toEqual({ text: { body: "Hello!" } });
    expect(msg.status).toBe("received");
    expect(msg.createdAt).toBeInstanceOf(Date);
  });
});
