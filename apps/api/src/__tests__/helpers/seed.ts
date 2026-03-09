import { tenants, apiKeys, aiConfigs, whatsappAccounts, conversations, messages, tenantQuotas, usageEvents, accounts, accountCredentials, tenantMembers, tenantInvitations } from "@eddnbot/db/schema";
import { generateApiKey } from "../../lib/api-key-utils";
import { testDb } from "./test-db";

export async function seedTenant(overrides: Partial<typeof tenants.$inferInsert> = {}) {
  const [tenant] = await testDb
    .insert(tenants)
    .values({
      name: "Test Tenant",
      slug: `test-${Date.now()}`,
      ...overrides,
    })
    .returning();
  return tenant;
}

export async function seedApiKey(
  tenantId: string,
  overrides: Partial<typeof apiKeys.$inferInsert> = {},
) {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const [apiKey] = await testDb
    .insert(apiKeys)
    .values({
      tenantId,
      keyHash,
      keyPrefix,
      ...overrides,
    })
    .returning();
  return { apiKey, rawKey };
}

export async function seedAiConfig(
  tenantId: string,
  overrides: Partial<typeof aiConfigs.$inferInsert> = {},
) {
  const [config] = await testDb
    .insert(aiConfigs)
    .values({
      tenantId,
      provider: "openai",
      model: "gpt-4o",
      ...overrides,
    })
    .returning();
  return config;
}

export async function seedWhatsAppAccount(
  tenantId: string,
  overrides: Partial<typeof whatsappAccounts.$inferInsert> = {},
) {
  const [account] = await testDb
    .insert(whatsappAccounts)
    .values({
      tenantId,
      phoneNumberId: `phone-${Date.now()}`,
      wabaId: `waba-${Date.now()}`,
      accessToken: "EAAx-test-token",
      ...overrides,
    })
    .returning();
  return account;
}

export async function seedConversation(
  whatsappAccountId: string,
  overrides: Partial<typeof conversations.$inferInsert> = {},
) {
  const [conversation] = await testDb
    .insert(conversations)
    .values({
      whatsappAccountId,
      contactPhone: `549${Date.now()}`.slice(0, 15),
      ...overrides,
    })
    .returning();
  return conversation;
}

export async function seedMessage(
  conversationId: string,
  overrides: Partial<typeof messages.$inferInsert> = {},
) {
  const [message] = await testDb
    .insert(messages)
    .values({
      conversationId,
      direction: "inbound",
      type: "text",
      content: { body: "Hello" },
      ...overrides,
    })
    .returning();
  return message;
}

export async function seedTenantQuota(
  tenantId: string,
  overrides: Partial<typeof tenantQuotas.$inferInsert> = {},
) {
  const [quota] = await testDb
    .insert(tenantQuotas)
    .values({
      tenantId,
      ...overrides,
    })
    .returning();
  return quota;
}

export async function seedAccount(
  overrides: Partial<typeof accounts.$inferInsert> = {},
) {
  const [account] = await testDb
    .insert(accounts)
    .values({
      email: `user-${Date.now()}@test.com`,
      name: "Test User",
      ...overrides,
    })
    .returning();
  return account;
}

export async function seedAccountCredentials(
  accountId: string,
  overrides: Partial<typeof accountCredentials.$inferInsert> = {},
) {
  const [creds] = await testDb
    .insert(accountCredentials)
    .values({
      accountId,
      passwordHash: "not-a-real-hash",
      ...overrides,
    })
    .returning();
  return creds;
}

export async function seedTenantMember(
  accountId: string,
  tenantId: string,
  overrides: Partial<typeof tenantMembers.$inferInsert> = {},
) {
  const [member] = await testDb
    .insert(tenantMembers)
    .values({
      accountId,
      tenantId,
      ...overrides,
    })
    .returning();
  return member;
}

export async function seedInvitation(
  tenantId: string,
  invitedBy: string,
  overrides: Partial<typeof tenantInvitations.$inferInsert> = {},
) {
  const [invitation] = await testDb
    .insert(tenantInvitations)
    .values({
      tenantId,
      email: `invited-${Date.now()}@test.com`,
      tokenHash: `hash-${Date.now()}`,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
    })
    .returning();
  return invitation;
}

export async function seedUsageEvent(
  tenantId: string,
  overrides: Partial<typeof usageEvents.$inferInsert> = {},
) {
  const [event] = await testDb
    .insert(usageEvents)
    .values({
      tenantId,
      eventType: "api_request",
      ...overrides,
    })
    .returning();
  return event;
}
