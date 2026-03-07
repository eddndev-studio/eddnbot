import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { tenantMembers } from "@eddnbot/db/schema";
import { buildTestApp } from "../helpers/build-test-app";
import { seedAccount, seedAccountCredentials } from "../helpers/seed";
import { testDb } from "../helpers/test-db";

describe("POST /api/tenants (self-service)", () => {
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

  it("creates a tenant and adds the creator as owner", async () => {
    const { account, accessToken } = await loginAs(
      `tenant-self-${Date.now()}@test.com`,
    );

    const res = await app.inject({
      method: "POST",
      url: "/api/tenants",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "My Workspace", slug: `ws-${Date.now()}` },
    });

    expect(res.statusCode).toBe(201);
    const tenant = res.json();
    expect(tenant.name).toBe("My Workspace");

    // Verify membership
    const [membership] = await testDb
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenant.id));

    expect(membership.accountId).toBe(account.id);
    expect(membership.role).toBe("owner");
  });

  it("returns 409 for duplicate slug", async () => {
    const { accessToken } = await loginAs(
      `tenant-dup-${Date.now()}@test.com`,
    );
    const slug = `dup-${Date.now()}`;

    await app.inject({
      method: "POST",
      url: "/api/tenants",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "First", slug },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/tenants",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Second", slug },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Slug already exists");
  });

  it("returns 401 without auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tenants",
      payload: { name: "No Auth", slug: "no-auth" },
    });

    expect(res.statusCode).toBe(401);
  });
});
