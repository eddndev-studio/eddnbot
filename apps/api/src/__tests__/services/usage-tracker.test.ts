import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { usageEvents } from "@eddnbot/db/schema";
import { testDb } from "../helpers/test-db";
import { testRedis } from "../helpers/test-redis";
import { seedTenant, seedTenantQuota, seedUsageEvent } from "../helpers/seed";
import {
  trackAiTokens,
  trackWhatsAppMessage,
  trackApiRequest,
  checkQuota,
} from "../../services/usage-tracker";

describe("trackAiTokens", () => {
  it("inserts a usage event and increments Redis counter", async () => {
    const tenant = await seedTenant();

    await trackAiTokens(testDb, testRedis, tenant.id, {
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
    });

    const [event] = await testDb
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.tenantId, tenant.id));

    expect(event.eventType).toBe("ai_tokens");
    expect(event.provider).toBe("openai");
    expect(event.model).toBe("gpt-4o");
    expect(event.inputTokens).toBe(100);
    expect(event.outputTokens).toBe(200);

    // Check Redis counter
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const redisVal = await testRedis.get(`quota:${tenant.id}:ai_tokens:${month}`);
    expect(Number(redisVal)).toBe(300);
  });
});

describe("trackWhatsAppMessage", () => {
  it("inserts a usage event and increments Redis counter", async () => {
    const tenant = await seedTenant();

    await trackWhatsAppMessage(testDb, testRedis, tenant.id);

    const [event] = await testDb
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.tenantId, tenant.id));

    expect(event.eventType).toBe("whatsapp_message");

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const redisVal = await testRedis.get(`quota:${tenant.id}:whatsapp_messages:${month}`);
    expect(Number(redisVal)).toBe(1);
  });
});

describe("trackApiRequest", () => {
  it("inserts a usage event with request details", async () => {
    const tenant = await seedTenant();

    await trackApiRequest(testDb, testRedis, tenant.id, {
      endpoint: "/ai/chat",
      method: "POST",
      statusCode: 200,
    });

    const [event] = await testDb
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.tenantId, tenant.id));

    expect(event.eventType).toBe("api_request");
    expect(event.endpoint).toBe("/ai/chat");
    expect(event.method).toBe("POST");
    expect(event.statusCode).toBe(200);
  });
});

describe("checkQuota", () => {
  it("allows when no quota configured (unlimited)", async () => {
    const tenant = await seedTenant();

    const result = await checkQuota(testDb, testRedis, tenant.id, "ai_tokens");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it("allows when usage is under quota", async () => {
    const tenant = await seedTenant();
    await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 1000 });

    // Track some usage
    await trackAiTokens(testDb, testRedis, tenant.id, {
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
    });

    const result = await checkQuota(testDb, testRedis, tenant.id, "ai_tokens");

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(300);
    expect(result.limit).toBe(1000);
  });

  it("blocks when usage exceeds quota", async () => {
    const tenant = await seedTenant();
    await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 500 });

    // Track usage that exceeds quota
    await trackAiTokens(testDb, testRedis, tenant.id, {
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 300,
      outputTokens: 300,
    });

    const result = await checkQuota(testDb, testRedis, tenant.id, "ai_tokens");

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(600);
    expect(result.limit).toBe(500);
  });

  it("checks whatsapp_messages quota", async () => {
    const tenant = await seedTenant();
    await seedTenantQuota(tenant.id, { maxWhatsappMessagesPerMonth: 2 });

    await trackWhatsAppMessage(testDb, testRedis, tenant.id);
    await trackWhatsAppMessage(testDb, testRedis, tenant.id);

    const result = await checkQuota(testDb, testRedis, tenant.id, "whatsapp_messages");

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(2);
  });

  it("reconstructs from PG on Redis cache miss", async () => {
    const tenant = await seedTenant();
    await seedTenantQuota(tenant.id, { maxAiTokensPerMonth: 10000 });

    // Insert events directly into PG (no Redis)
    await seedUsageEvent(tenant.id, {
      eventType: "ai_tokens",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 500,
      outputTokens: 500,
    });

    const result = await checkQuota(testDb, testRedis, tenant.id, "ai_tokens");

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1000);
    expect(result.limit).toBe(10000);
  });
});
