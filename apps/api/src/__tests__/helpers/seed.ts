import { tenants, apiKeys, aiConfigs, whatsappAccounts, conversations } from "@eddnbot/db/schema";
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
