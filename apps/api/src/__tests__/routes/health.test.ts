import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "../helpers/build-test-app";

describe("health routes", () => {
  const appPromise = buildTestApp();

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("GET /health returns 200 with status ok", async () => {
    const app = await appPromise;
    const res = await app.inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /health/ready returns 200 with database connected", async () => {
    const app = await appPromise;
    const res = await app.inject({ method: "GET", url: "/api/health/ready" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: "ready",
      services: { database: "connected" },
    });
  });
});
