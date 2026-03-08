import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import * as argon2 from "argon2";
import {
  accounts,
  accountCredentials,
  tenantMembers,
  authSessions,
  tenants,
} from "@eddnbot/db/schema";
import {
  hashToken,
  generateAuthToken,
  generateRefreshToken,
  generateVerifyToken,
} from "../lib/auth-token-utils";
import { verifyEmailTemplate, resetPasswordTemplate } from "@eddnbot/email";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api",
};

function setAuthCookies(
  reply: import("fastify").FastifyReply,
  accessToken: string,
  refreshToken: string,
) {
  reply.setCookie("eddnbot_access", accessToken, {
    ...COOKIE_OPTS,
    maxAge: ACCESS_TOKEN_TTL_MS / 1000,
  });
  reply.setCookie("eddnbot_refresh", refreshToken, {
    ...COOKIE_OPTS,
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_TTL_MS / 1000,
  });
}

function clearAuthCookies(reply: import("fastify").FastifyReply) {
  reply.clearCookie("eddnbot_access", { ...COOKIE_OPTS });
  reply.clearCookie("eddnbot_refresh", { ...COOKIE_OPTS, path: "/api/auth/refresh" });
}

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

function createTokenPair() {
  const access = generateAuthToken();
  const refresh = generateRefreshToken();
  const now = Date.now();
  return {
    access,
    refresh,
    expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  };
}

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post(
    "/auth/register",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);

      const passwordHash = await argon2.hash(body.password);
      const verifyToken = generateVerifyToken();
      const verifyExpiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

      try {
        const [account] = await app.db
          .insert(accounts)
          .values({ email: body.email.toLowerCase(), name: body.name })
          .returning();

        await app.db.insert(accountCredentials).values({
          accountId: account.id,
          passwordHash,
          emailVerifyToken: hashToken(verifyToken),
          emailVerifyExpiresAt: verifyExpiresAt,
        });

        if (app.email && app.env.APP_BASE_URL) {
          const template = verifyEmailTemplate(verifyToken, {
            baseUrl: app.env.APP_BASE_URL,
          });
          await app.email.send({ to: body.email.toLowerCase(), ...template });
        }

        return reply.code(201).send({
          id: account.id,
          email: account.email,
          name: account.name,
          emailVerified: false,
        });
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          return reply.code(409).send({ error: "Email already registered" });
        }
        throw err;
      }
    },
  );

  // POST /auth/login
  app.post(
    "/auth/login",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);

      const result = await app.db
        .select()
        .from(accounts)
        .innerJoin(
          accountCredentials,
          eq(accounts.id, accountCredentials.accountId),
        )
        .where(eq(accounts.email, body.email.toLowerCase()))
        .limit(1);

      if (result.length === 0) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      const { accounts: account, account_credentials: creds } = result[0];

      const valid = await argon2.verify(creds.passwordHash, body.password);
      if (!valid) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      if (!creds.emailVerified) {
        return reply.code(403).send({ error: "Email not verified" });
      }

      // Create session tokens
      const { access, refresh, expiresAt, refreshExpiresAt } =
        createTokenPair();

      await app.db.insert(authSessions).values({
        accountId: account.id,
        tokenHash: access.tokenHash,
        refreshTokenHash: refresh.tokenHash,
        expiresAt,
        refreshExpiresAt,
      });

      // Fetch tenant memberships
      const memberships = await app.db
        .select({
          tenantId: tenantMembers.tenantId,
          role: tenantMembers.role,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
        })
        .from(tenantMembers)
        .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
        .where(
          and(
            eq(tenantMembers.accountId, account.id),
            eq(tenants.isActive, true),
          ),
        );

      setAuthCookies(reply, access.rawToken, refresh.rawToken);

      return reply.send({
        accessToken: access.rawToken,
        refreshToken: refresh.rawToken,
        expiresAt: expiresAt.toISOString(),
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
        },
        tenants: memberships,
      });
    },
  );

  // POST /auth/refresh
  app.post(
    "/auth/refresh",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const { refreshToken: bodyToken } = refreshSchema
        .partial()
        .parse(request.body ?? {});
      const rawRefresh =
        bodyToken || (request.cookies?.eddnbot_refresh ?? null);
      if (!rawRefresh) {
        return reply.code(401).send({ error: "Missing refresh token" });
      }
      const refreshHash = hashToken(rawRefresh);

      const result = await app.db
        .select()
        .from(authSessions)
        .innerJoin(accounts, eq(authSessions.accountId, accounts.id))
        .where(eq(authSessions.refreshTokenHash, refreshHash))
        .limit(1);

      if (result.length === 0) {
        return reply.code(401).send({ error: "Invalid refresh token" });
      }

      const { auth_sessions: session, accounts: account } = result[0];

      if (session.refreshExpiresAt < new Date()) {
        await app.db
          .delete(authSessions)
          .where(eq(authSessions.id, session.id));
        return reply.code(401).send({ error: "Refresh token expired" });
      }

      // Delete old session, create new one (rotate tokens)
      await app.db
        .delete(authSessions)
        .where(eq(authSessions.id, session.id));

      const { access, refresh, expiresAt, refreshExpiresAt } =
        createTokenPair();

      await app.db.insert(authSessions).values({
        accountId: account.id,
        tokenHash: access.tokenHash,
        refreshTokenHash: refresh.tokenHash,
        expiresAt,
        refreshExpiresAt,
      });

      setAuthCookies(reply, access.rawToken, refresh.rawToken);

      return reply.send({
        accessToken: access.rawToken,
        refreshToken: refresh.rawToken,
        expiresAt: expiresAt.toISOString(),
      });
    },
  );

  // POST /auth/verify-email
  app.post(
    "/auth/verify-email",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const body = verifyEmailSchema.parse(request.body);
      const tokenHash = hashToken(body.token);

      const result = await app.db
        .select()
        .from(accountCredentials)
        .where(eq(accountCredentials.emailVerifyToken, tokenHash))
        .limit(1);

      if (result.length === 0) {
        return reply.code(400).send({ error: "Invalid or expired token" });
      }

      const creds = result[0];

      if (
        creds.emailVerifyExpiresAt &&
        creds.emailVerifyExpiresAt < new Date()
      ) {
        return reply.code(400).send({ error: "Invalid or expired token" });
      }

      await app.db
        .update(accountCredentials)
        .set({
          emailVerified: true,
          emailVerifyToken: null,
          emailVerifyExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(accountCredentials.id, creds.id));

      return reply.send({ message: "Email verified" });
    },
  );

  // POST /auth/forgot-password
  app.post(
    "/auth/forgot-password",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const body = forgotPasswordSchema.parse(request.body);

      const result = await app.db
        .select()
        .from(accounts)
        .innerJoin(
          accountCredentials,
          eq(accounts.id, accountCredentials.accountId),
        )
        .where(eq(accounts.email, body.email.toLowerCase()))
        .limit(1);

      // Always return success to prevent email enumeration
      if (result.length === 0) {
        return reply.send({ message: "If the email exists, a reset link has been sent" });
      }

      const { account_credentials: creds } = result[0];

      const resetToken = generateVerifyToken();
      const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await app.db
        .update(accountCredentials)
        .set({
          passwordResetToken: hashToken(resetToken),
          passwordResetExpiresAt: resetExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(accountCredentials.id, creds.id));

      if (app.email && app.env.APP_BASE_URL) {
        const template = resetPasswordTemplate(resetToken, {
          baseUrl: app.env.APP_BASE_URL,
        });
        await app.email.send({
          to: body.email.toLowerCase(),
          ...template,
        });
      }

      return reply.send({ message: "If the email exists, a reset link has been sent" });
    },
  );

  // POST /auth/reset-password
  app.post(
    "/auth/reset-password",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const body = resetPasswordSchema.parse(request.body);
      const tokenHash = hashToken(body.token);

      const result = await app.db
        .select()
        .from(accountCredentials)
        .where(eq(accountCredentials.passwordResetToken, tokenHash))
        .limit(1);

      if (result.length === 0) {
        return reply.code(400).send({ error: "Invalid or expired token" });
      }

      const creds = result[0];

      if (
        creds.passwordResetExpiresAt &&
        creds.passwordResetExpiresAt < new Date()
      ) {
        return reply.code(400).send({ error: "Invalid or expired token" });
      }

      const passwordHash = await argon2.hash(body.password);

      await app.db
        .update(accountCredentials)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(accountCredentials.id, creds.id));

      // Invalidate all existing sessions for this account
      await app.db
        .delete(authSessions)
        .where(eq(authSessions.accountId, creds.accountId));

      return reply.send({ message: "Password reset successfully" });
    },
  );

  // GET /auth/me (requires accountAuth)
  app.get(
    "/auth/me",
    { config: { accountAuth: true } },
    async (request) => {
      const account = request.account!;

      const memberships = await app.db
        .select({
          tenantId: tenantMembers.tenantId,
          role: tenantMembers.role,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
        })
        .from(tenantMembers)
        .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
        .where(
          and(
            eq(tenantMembers.accountId, account.id),
            eq(tenants.isActive, true),
          ),
        );

      return {
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
        },
        tenants: memberships,
      };
    },
  );

  // POST /auth/logout
  app.post(
    "/auth/logout",
    { config: { skipAuth: true } },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      const rawToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : (request.cookies.eddnbot_access ?? null);

      if (rawToken) {
        const tokenHash = hashToken(rawToken);
        await app.db
          .delete(authSessions)
          .where(eq(authSessions.tokenHash, tokenHash));
      }

      clearAuthCookies(reply);
      return reply.code(204).send();
    },
  );
}
