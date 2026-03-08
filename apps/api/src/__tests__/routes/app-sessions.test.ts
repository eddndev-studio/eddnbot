import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedAccount,
  seedAccountCredentials,
  seedTenant,
  seedTenantMember,
  seedApiKey,
  seedAiConfig,
} from "../helpers/seed";

describe("POST /api/app/sessions", () => {
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

  it("creates a session with Bearer + X-Tenant-Id auth", async () => {
    const { account, accessToken } = await loginAs(
      `app-sess-bearer-${Date.now()}@test.com`,
    );
    const tenant = await seedTenant({ slug: `app-sess-${Date.now()}` });
    await seedTenantMember(account.id, tenant.id);

    const res = await app.inject({
      method: "POST",
      url: "/api/app/sessions",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-tenant-id": tenant.id,
      },
      payload: {},
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
    expect(body.expiresAt).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  it("creates a session with aiConfigId using account auth", async () => {
    const { account, accessToken } = await loginAs(
      `app-sess-ai-${Date.now()}@test.com`,
    );
    const tenant = await seedTenant({ slug: `app-sess-ai-${Date.now()}` });
    await seedTenantMember(account.id, tenant.id);
    const aiConfig = await seedAiConfig(tenant.id, { label: "session-test" });

    const res = await app.inject({
      method: "POST",
      url: "/api/app/sessions",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-tenant-id": tenant.id,
      },
      payload: { aiConfigId: aiConfig.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
    expect(body.expiresAt).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/app/sessions",
      payload: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non-member tenant", async () => {
    const { accessToken } = await loginAs(
      `app-sess-nomember-${Date.now()}@test.com`,
    );
    const tenant = await seedTenant({ slug: `app-sess-no-${Date.now()}` });

    const res = await app.inject({
      method: "POST",
      url: "/api/app/sessions",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-tenant-id": tenant.id,
      },
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("Not a member of this tenant");
  });

  it("creates a session with API key auth", async () => {
    const tenant = await seedTenant({ slug: `app-sess-key-${Date.now()}` });
    const { rawKey } = await seedApiKey(tenant.id);

    const res = await app.inject({
      method: "POST",
      url: "/api/app/sessions",
      headers: { "x-api-key": rawKey },
      payload: {},
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
    expect(body.expiresAt).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });
});
