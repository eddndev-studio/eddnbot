import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey, seedTenantQuota, seedUsageEvent } from "../helpers/seed";

describe("GET /usage", () => {
  it("returns empty usage for fresh tenant", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "GET",
      url: "/usage",
      headers: { "x-api-key": rawKey },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.aiTokens.total).toBe(0);
    expect(body.whatsappMessages).toBe(0);
    expect(body.apiRequests).toBe(0);
    expect(body.quotas).toBeNull();

    await app.close();
  });

  it("returns aggregated usage with provider breakdown", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    // Seed some usage events
    await seedUsageEvent(tenant.id, {
      eventType: "ai_tokens",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
    });
    await seedUsageEvent(tenant.id, {
      eventType: "ai_tokens",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputTokens: 50,
      outputTokens: 150,
    });
    await seedUsageEvent(tenant.id, {
      eventType: "whatsapp_message",
    });
    await seedUsageEvent(tenant.id, {
      eventType: "api_request",
      endpoint: "/ai/chat",
      method: "POST",
      statusCode: 200,
    });

    const res = await app.inject({
      method: "GET",
      url: "/usage",
      headers: { "x-api-key": rawKey },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.aiTokens.total).toBe(500);
    expect(body.aiTokens.byProvider.openai).toBe(300);
    expect(body.aiTokens.byProvider.anthropic).toBe(200);
    expect(body.whatsappMessages).toBe(1);
    expect(body.apiRequests).toBe(1);

    await app.close();
  });

  it("includes quota info when configured", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);
    await seedTenantQuota(tenant.id, {
      maxAiTokensPerMonth: 100000,
      maxWhatsappMessagesPerMonth: 500,
    });

    const res = await app.inject({
      method: "GET",
      url: "/usage",
      headers: { "x-api-key": rawKey },
    });

    const body = res.json();
    expect(body.quotas).toBeDefined();
    expect(body.quotas.maxAiTokensPerMonth).toBe(100000);
    expect(body.quotas.maxWhatsappMessagesPerMonth).toBe(500);

    await app.close();
  });

  it("filters by month parameter", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    // Seed event for current month
    await seedUsageEvent(tenant.id, {
      eventType: "whatsapp_message",
    });

    // Query a different month
    const res = await app.inject({
      method: "GET",
      url: "/usage?month=2025-01",
      headers: { "x-api-key": rawKey },
    });

    const body = res.json();
    expect(body.month).toBe("2025-01");
    expect(body.whatsappMessages).toBe(0);

    await app.close();
  });

  it("requires auth", async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: "GET",
      url: "/usage",
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});
