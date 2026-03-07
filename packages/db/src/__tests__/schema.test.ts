import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { testDb } from "./helpers/test-db";
import {
  tenants,
  accounts,
  accountCredentials,
  tenantMembers,
  apiKeys,
  aiConfigs,
  whatsappAccounts,
  conversations,
  messages,
  usageEvents,
  tenantQuotas,
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

  it("cascade deletes tenant_members and api_keys when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();

    await testDb.insert(tenantMembers).values({
      accountId: account.id,
      tenantId: tenant.id,
      role: "owner",
    });

    await testDb.insert(apiKeys).values({
      tenantId: tenant.id,
      keyHash: "a".repeat(64),
      keyPrefix: "ek_live_abc",
    });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remainingMembers = await testDb
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenant.id));
    const remainingKeys = await testDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenant.id));

    expect(remainingMembers).toHaveLength(0);
    expect(remainingKeys).toHaveLength(0);
  });
});

describe("accounts", () => {
  it("inserts and queries an account", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();

    expect(account.id).toBeDefined();
    expect(account.email).toBe("user@acme.com");
    expect(account.name).toBe("Test User");
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it("enforces unique email constraint", async () => {
    await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "User 1" });

    await expect(
      testDb.insert(accounts).values({ email: "user@acme.com", name: "User 2" }),
    ).rejects.toThrow();
  });
});

describe("accountCredentials", () => {
  it("inserts credentials for an account", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();

    const [creds] = await testDb
      .insert(accountCredentials)
      .values({
        accountId: account.id,
        passwordHash: "hashed_password_here",
      })
      .returning();

    expect(creds.id).toBeDefined();
    expect(creds.accountId).toBe(account.id);
    expect(creds.emailVerified).toBe(false);
    expect(creds.emailVerifyToken).toBeNull();
    expect(creds.passwordResetToken).toBeNull();
  });

  it("enforces unique account_id constraint", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();

    await testDb.insert(accountCredentials).values({
      accountId: account.id,
      passwordHash: "hash1",
    });

    await expect(
      testDb.insert(accountCredentials).values({
        accountId: account.id,
        passwordHash: "hash2",
      }),
    ).rejects.toThrow();
  });

  it("cascade deletes when account is deleted", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();

    await testDb.insert(accountCredentials).values({
      accountId: account.id,
      passwordHash: "hash",
    });

    await testDb.delete(accounts).where(eq(accounts.id, account.id));

    const remaining = await testDb
      .select()
      .from(accountCredentials)
      .where(eq(accountCredentials.accountId, account.id));
    expect(remaining).toHaveLength(0);
  });
});

describe("tenantMembers", () => {
  it("inserts a membership", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [member] = await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant.id, role: "owner" })
      .returning();

    expect(member.id).toBeDefined();
    expect(member.accountId).toBe(account.id);
    expect(member.tenantId).toBe(tenant.id);
    expect(member.role).toBe("owner");
  });

  it("defaults role to member", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [member] = await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant.id })
      .returning();

    expect(member.role).toBe("member");
  });

  it("enforces unique (account_id, tenant_id) constraint", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant.id });

    await expect(
      testDb
        .insert(tenantMembers)
        .values({ accountId: account.id, tenantId: tenant.id }),
    ).rejects.toThrow();
  });

  it("allows same account in multiple tenants", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();
    const [tenant1] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [tenant2] = await testDb
      .insert(tenants)
      .values({ name: "Beta", slug: "beta" })
      .returning();

    await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant1.id, role: "owner" });
    await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant2.id, role: "member" });

    const memberships = await testDb
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.accountId, account.id));
    expect(memberships).toHaveLength(2);
  });

  it("cascade deletes when account is deleted", async () => {
    const [account] = await testDb
      .insert(accounts)
      .values({ email: "user@acme.com", name: "Test User" })
      .returning();
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb
      .insert(tenantMembers)
      .values({ accountId: account.id, tenantId: tenant.id });

    await testDb.delete(accounts).where(eq(accounts.id, account.id));

    const remaining = await testDb
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.accountId, account.id));
    expect(remaining).toHaveLength(0);
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

  it("inserts with aiConfigId null by default", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "null-cfg-phone",
        wabaId: "waba-001",
        accessToken: "token",
      })
      .returning();

    expect(account.aiConfigId).toBeNull();
    expect(account.autoReplyEnabled).toBe(false);
  });

  it("inserts with a valid aiConfigId FK", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [config] = await testDb
      .insert(aiConfigs)
      .values({ tenantId: tenant.id, provider: "openai", model: "gpt-4o" })
      .returning();

    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "fk-phone",
        wabaId: "waba-001",
        accessToken: "token",
        aiConfigId: config.id,
        autoReplyEnabled: true,
      })
      .returning();

    expect(account.aiConfigId).toBe(config.id);
    expect(account.autoReplyEnabled).toBe(true);
  });

  it("sets aiConfigId to null on ai_config delete (SET NULL)", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();
    const [config] = await testDb
      .insert(aiConfigs)
      .values({ tenantId: tenant.id, provider: "openai", model: "gpt-4o" })
      .returning();
    const [account] = await testDb
      .insert(whatsappAccounts)
      .values({
        tenantId: tenant.id,
        phoneNumberId: "set-null-phone",
        wabaId: "waba-001",
        accessToken: "token",
        aiConfigId: config.id,
      })
      .returning();

    // Delete the ai config
    await testDb.delete(aiConfigs).where(eq(aiConfigs.id, config.id));

    const [updated] = await testDb
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, account.id));

    expect(updated.aiConfigId).toBeNull();
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

describe("usageEvents", () => {
  it("inserts and queries a usage event", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [event] = await testDb
      .insert(usageEvents)
      .values({
        tenantId: tenant.id,
        eventType: "ai_tokens",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 200,
      })
      .returning();

    expect(event.id).toBeDefined();
    expect(event.tenantId).toBe(tenant.id);
    expect(event.eventType).toBe("ai_tokens");
    expect(event.provider).toBe("openai");
    expect(event.model).toBe("gpt-4o");
    expect(event.inputTokens).toBe(100);
    expect(event.outputTokens).toBe(200);
    expect(event.metadata).toEqual({});
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it("cascade deletes when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(usageEvents).values({
      tenantId: tenant.id,
      eventType: "api_request",
      endpoint: "/ai/chat",
      method: "POST",
      statusCode: 200,
    });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remaining = await testDb
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.tenantId, tenant.id));
    expect(remaining).toHaveLength(0);
  });
});

describe("tenantQuotas", () => {
  it("inserts and queries tenant quotas", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [quota] = await testDb
      .insert(tenantQuotas)
      .values({
        tenantId: tenant.id,
        maxAiTokensPerMonth: 100000,
        maxWhatsappMessagesPerMonth: 1000,
        maxApiRequestsPerMonth: 50000,
        maxRequestsPerMinute: 120,
      })
      .returning();

    expect(quota.id).toBeDefined();
    expect(quota.tenantId).toBe(tenant.id);
    expect(quota.maxAiTokensPerMonth).toBe(100000);
    expect(quota.maxWhatsappMessagesPerMonth).toBe(1000);
    expect(quota.maxApiRequestsPerMonth).toBe(50000);
    expect(quota.maxRequestsPerMinute).toBe(120);
    expect(quota.createdAt).toBeInstanceOf(Date);
    expect(quota.updatedAt).toBeInstanceOf(Date);
  });

  it("enforces unique tenant_id constraint", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(tenantQuotas).values({ tenantId: tenant.id });

    await expect(
      testDb.insert(tenantQuotas).values({ tenantId: tenant.id }),
    ).rejects.toThrow();
  });

  it("defaults maxRequestsPerMinute to 60", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    const [quota] = await testDb
      .insert(tenantQuotas)
      .values({ tenantId: tenant.id })
      .returning();

    expect(quota.maxRequestsPerMinute).toBe(60);
    expect(quota.maxAiTokensPerMonth).toBeNull();
    expect(quota.maxWhatsappMessagesPerMonth).toBeNull();
    expect(quota.maxApiRequestsPerMonth).toBeNull();
  });

  it("cascade deletes when tenant is deleted", async () => {
    const [tenant] = await testDb
      .insert(tenants)
      .values({ name: "Acme", slug: "acme" })
      .returning();

    await testDb.insert(tenantQuotas).values({ tenantId: tenant.id });

    await testDb.delete(tenants).where(eq(tenants.id, tenant.id));

    const remaining = await testDb
      .select()
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, tenant.id));
    expect(remaining).toHaveLength(0);
  });
});
