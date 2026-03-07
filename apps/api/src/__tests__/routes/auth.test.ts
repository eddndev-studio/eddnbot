import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import * as argon2 from "argon2";
import { buildTestApp } from "../helpers/build-test-app";
import {
  seedAccount,
  seedAccountCredentials,
  seedTenant,
  seedTenantMember,
} from "../helpers/seed";
import { hashToken, generateVerifyToken } from "../../lib/auth-token-utils";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /api/auth/register", () => {
  it("creates a new account", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "new@example.com",
        password: "securePass123",
        name: "New User",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.email).toBe("new@example.com");
    expect(body.name).toBe("New User");
    expect(body.emailVerified).toBe(false);
  });

  it("normalizes email to lowercase", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "Upper@Example.COM",
        password: "securePass123",
        name: "Upper User",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().email).toBe("upper@example.com");
  });

  it("returns 409 for duplicate email", async () => {
    await seedAccount({ email: "dup@example.com" });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "dup@example.com",
        password: "securePass123",
        name: "Dup User",
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Email already registered");
  });

  it("returns 400 for invalid email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "not-an-email",
        password: "securePass123",
        name: "Bad User",
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "short@example.com",
        password: "short",
        name: "Short Pass",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    const account = await seedAccount({ email: "login@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });
    const tenant = await seedTenant();
    await seedTenantMember(account.id, tenant.id, { role: "owner" });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "login@example.com", password: "myPassword123" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toMatch(/^ea_live_/);
    expect(body.refreshToken).toMatch(/^er_live_/);
    expect(body.expiresAt).toBeDefined();
    expect(body.account.id).toBe(account.id);
    expect(body.account.email).toBe("login@example.com");
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0].role).toBe("owner");
  });

  it("returns 401 for wrong password", async () => {
    const account = await seedAccount({ email: "wrong@example.com" });
    const passwordHash = await argon2.hash("correctPassword");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "wrong@example.com", password: "wrongPassword" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Invalid email or password");
  });

  it("returns 401 for non-existent email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "noone@example.com", password: "whatever" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Invalid email or password");
  });

  it("returns 403 for unverified email", async () => {
    const account = await seedAccount({ email: "unverified@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: false,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "unverified@example.com", password: "myPassword123" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("Email not verified");
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns new token pair for valid refresh token", async () => {
    const account = await seedAccount({ email: "refresh@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    // Login first
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "refresh@example.com", password: "myPassword123" },
    });

    const { refreshToken } = loginRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toMatch(/^ea_live_/);
    expect(body.refreshToken).toMatch(/^er_live_/);
    // New tokens should be different
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it("returns 401 for invalid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: "er_live_invalid" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("invalidates old refresh token after rotation", async () => {
    const account = await seedAccount({ email: "rotate@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "rotate@example.com", password: "myPassword123" },
    });

    const { refreshToken } = loginRes.json();

    // First refresh succeeds
    await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });

    // Second refresh with same token fails (rotated)
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/verify-email", () => {
  it("verifies email with valid token", async () => {
    const verifyToken = generateVerifyToken();
    const account = await seedAccount({ email: "verify@example.com" });
    await seedAccountCredentials(account.id, {
      passwordHash: await argon2.hash("pass12345"),
      emailVerifyToken: hashToken(verifyToken),
      emailVerifyExpiresAt: new Date(Date.now() + 86400000),
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { token: verifyToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe("Email verified");

    // Should now be able to login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "verify@example.com", password: "pass12345" },
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it("returns 400 for invalid token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { token: "invalid-token" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for expired token", async () => {
    const verifyToken = generateVerifyToken();
    const account = await seedAccount({ email: "expired-verify@example.com" });
    await seedAccountCredentials(account.id, {
      passwordHash: await argon2.hash("pass12345"),
      emailVerifyToken: hashToken(verifyToken),
      emailVerifyExpiresAt: new Date(Date.now() - 1000), // expired
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { token: verifyToken },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns success for existing email", async () => {
    const account = await seedAccount({ email: "forgot@example.com" });
    await seedAccountCredentials(account.id, {
      passwordHash: await argon2.hash("oldpass123"),
      emailVerified: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email: "forgot@example.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain("reset link");
  });

  it("returns success for non-existent email (no enumeration)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email: "nobody@example.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain("reset link");
  });
});

describe("POST /api/auth/reset-password", () => {
  it("resets password with valid token", async () => {
    const resetToken = generateVerifyToken();
    const account = await seedAccount({ email: "reset@example.com" });
    await seedAccountCredentials(account.id, {
      passwordHash: await argon2.hash("oldPassword"),
      emailVerified: true,
      passwordResetToken: hashToken(resetToken),
      passwordResetExpiresAt: new Date(Date.now() + 3600000),
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: resetToken, password: "newPassword123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe("Password reset successfully");

    // Login with new password
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "reset@example.com", password: "newPassword123" },
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it("returns 400 for invalid token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: "bad-token", password: "newPass123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for expired token", async () => {
    const resetToken = generateVerifyToken();
    const account = await seedAccount({ email: "expired-reset@example.com" });
    await seedAccountCredentials(account.id, {
      passwordHash: await argon2.hash("oldPassword"),
      emailVerified: true,
      passwordResetToken: hashToken(resetToken),
      passwordResetExpiresAt: new Date(Date.now() - 1000), // expired
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: resetToken, password: "newPass123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("invalidates all sessions after reset", async () => {
    const resetToken = generateVerifyToken();
    const account = await seedAccount({ email: "reset-sessions@example.com" });
    const passwordHash = await argon2.hash("oldPassword");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
      passwordResetToken: hashToken(resetToken),
      passwordResetExpiresAt: new Date(Date.now() + 3600000),
    });

    // Login to create a session
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "reset-sessions@example.com", password: "oldPassword" },
    });
    const { refreshToken } = loginRes.json();

    // Reset password
    await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: resetToken, password: "newPassword123" },
    });

    // Old refresh token should be invalid
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("invalidates the session", async () => {
    const account = await seedAccount({ email: "logout@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "logout@example.com", password: "myPassword123" },
    });
    const { accessToken, refreshToken } = loginRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(204);

    // Refresh should fail since session was deleted
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });

  it("returns 204 even without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });

    expect(res.statusCode).toBe(204);
  });
});

describe("accountAuth plugin", () => {
  it("authenticates valid access token", async () => {
    const account = await seedAccount({ email: "plugin@example.com" });
    const passwordHash = await argon2.hash("myPassword123");
    await seedAccountCredentials(account.id, {
      passwordHash,
      emailVerified: true,
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "plugin@example.com", password: "myPassword123" },
    });
    const { accessToken } = loginRes.json();

    // Use a protected accountAuth route — we'll test via /api/auth/me once it exists
    // For now, verify the token format is correct
    expect(accessToken).toMatch(/^ea_live_/);
  });
});
