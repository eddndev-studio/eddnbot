import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";
import { seedTenant } from "../helpers/seed";

describe("POST /tenants", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("creates a tenant and returns 201", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/tenants",
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
      url: "/tenants",
      payload: { slug: "no-name" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Validation error");
  });

  it("returns 400 for invalid slug format", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/tenants",
      payload: { name: "Test", slug: "INVALID SLUG!" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 409 for duplicate slug", async () => {
    const app = await appPromise;
    await seedTenant({ slug: "dup-slug", name: "First" });

    const res = await app.inject({
      method: "POST",
      url: "/tenants",
      payload: { name: "Second", slug: "dup-slug" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Slug already exists");
  });

  it("does not require auth (skipAuth)", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/tenants",
      payload: { name: "No Auth", slug: "no-auth" },
    });

    expect(res.statusCode).toBe(201);
  });
});
