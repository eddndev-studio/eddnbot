import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { usageEvents } from "@eddnbot/db/schema";
import { testDb } from "../helpers/test-db";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant, seedApiKey } from "../helpers/seed";

describe("usage-tracking plugin", () => {
  it("creates a usage event for authenticated requests", async () => {
    const app = await buildTestApp();
    const tenant = await seedTenant();
    const { rawKey } = await seedApiKey(tenant.id);

    await app.inject({
      method: "GET",
      url: "/ai/configs",
      headers: { "x-api-key": rawKey },
    });

    // Give fire-and-forget time to complete
    await new Promise((r) => setTimeout(r, 100));

    const events = await testDb
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.tenantId, tenant.id));

    expect(events.length).toBeGreaterThanOrEqual(1);
    const apiEvent = events.find((e) => e.eventType === "api_request");
    expect(apiEvent).toBeDefined();
    expect(apiEvent!.endpoint).toBe("/ai/configs");
    expect(apiEvent!.method).toBe("GET");
    expect(apiEvent!.statusCode).toBe(200);

    await app.close();
  });

  it("skips tracking for unauthenticated routes", async () => {
    const app = await buildTestApp();

    await app.inject({
      method: "GET",
      url: "/health",
    });

    await new Promise((r) => setTimeout(r, 100));

    const events = await testDb.select().from(usageEvents);
    expect(events).toHaveLength(0);

    await app.close();
  });
});
