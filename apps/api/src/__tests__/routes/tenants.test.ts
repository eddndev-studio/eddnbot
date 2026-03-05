import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant } from "../helpers/seed";

const ADMIN_SECRET = "test-admin-secret-that-is-at-least-32-chars-long";
const adminHeaders = { "x-admin-token": ADMIN_SECRET };

describe("POST /admin/tenants", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("creates a tenant and returns 201", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      headers: adminHeaders,
      payload: { name: "Acme Corp", slug: "acme-corp" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Acme Corp");
    expect(body.slug).toBe("acme-corp");
    expect(body.isActive).toBe(true);
  });

  it("returns 400 for missing name", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      headers: adminHeaders,
      payload: { slug: "no-name" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Validation error");
  });

  it("returns 400 for invalid slug format", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      headers: adminHeaders,
      payload: { name: "Test", slug: "INVALID SLUG!" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 409 for duplicate slug", async () => {
    const app = await appPromise;
    await seedTenant({ slug: "dup-slug", name: "First" });

    const res = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      headers: adminHeaders,
      payload: { name: "Second", slug: "dup-slug" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Slug already exists");
  });

  it("requires admin token (returns 401 without it)", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      payload: { name: "No Auth", slug: "no-auth" },
    });

    expect(res.statusCode).toBe(401);
  });
});
