import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { tenantInvitations, tenantMembers, tenants, accounts } from "@eddnbot/db/schema";
import { hashToken, generateVerifyToken } from "../lib/auth-token-utils";
import { invitationTemplate } from "@eddnbot/email";
import { getCallerRole } from "../lib/role-utils";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const inviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(["admin", "member"]).default("member"),
});

const acceptSchema = z.object({
  token: z.string(),
});

export async function tenantInvitationRoutes(app: FastifyInstance) {
  // POST /tenants/invitations — Invite a user by email
  app.post("/tenants/invitations", async (request, reply) => {
    const body = inviteSchema.parse(request.body);
    const email = body.email.toLowerCase();

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can invite members" });
    }

    // Check if already a member
    const existingMember = await app.db
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .innerJoin(accounts, eq(tenantMembers.accountId, accounts.id))
      .where(
        and(
          eq(accounts.email, email),
          eq(tenantMembers.tenantId, request.tenant.id),
        ),
      )
      .limit(1);

    if (existingMember.length > 0) {
      return reply.code(409).send({ error: "User is already a member of this workspace" });
    }

    // Check for existing pending invitation
    const existingInvite = await app.db
      .select({ id: tenantInvitations.id })
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.email, email),
          eq(tenantInvitations.tenantId, request.tenant.id),
          eq(tenantInvitations.status, "pending"),
        ),
      )
      .limit(1);

    if (existingInvite.length > 0) {
      return reply.code(409).send({ error: "A pending invitation already exists for this email" });
    }

    const rawToken = generateVerifyToken();
    const tokenHash = hashToken(rawToken);

    const [invitation] = await app.db
      .insert(tenantInvitations)
      .values({
        tenantId: request.tenant.id,
        email,
        role: body.role,
        tokenHash,
        invitedBy: request.account!.id,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      })
      .returning();

    // Send invitation email
    if (app.email && app.env.APP_BASE_URL) {
      const template = invitationTemplate(rawToken, {
        baseUrl: app.env.APP_BASE_URL,
        tenantName: request.tenant.name,
        inviterName: request.account!.name,
        role: body.role,
      });
      await app.email.send({ to: email, ...template });
    }

    return reply.code(201).send({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  });

  // GET /tenants/invitations — List pending invitations for current tenant
  app.get("/tenants/invitations", async (request, reply) => {
    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can view invitations" });
    }

    const invitations = await app.db
      .select({
        id: tenantInvitations.id,
        email: tenantInvitations.email,
        role: tenantInvitations.role,
        status: tenantInvitations.status,
        expiresAt: tenantInvitations.expiresAt,
        createdAt: tenantInvitations.createdAt,
        inviterName: accounts.name,
      })
      .from(tenantInvitations)
      .innerJoin(accounts, eq(tenantInvitations.invitedBy, accounts.id))
      .where(
        and(
          eq(tenantInvitations.tenantId, request.tenant.id),
          eq(tenantInvitations.status, "pending"),
        ),
      );

    return { invitations };
  });

  // DELETE /tenants/invitations/:invitationId — Revoke an invitation
  app.delete("/tenants/invitations/:invitationId", async (request, reply) => {
    const { invitationId } = request.params as { invitationId: string };

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can revoke invitations" });
    }

    const [invitation] = await app.db
      .select()
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.id, invitationId),
          eq(tenantInvitations.tenantId, request.tenant.id),
          eq(tenantInvitations.status, "pending"),
        ),
      )
      .limit(1);

    if (!invitation) {
      return reply.code(404).send({ error: "Invitation not found" });
    }

    await app.db
      .update(tenantInvitations)
      .set({ status: "revoked" })
      .where(eq(tenantInvitations.id, invitationId));

    return reply.code(204).send();
  });

  // GET /tenants/invitations/pending — My pending invitations (accountAuth)
  app.get(
    "/tenants/invitations/pending",
    { config: { accountAuth: true } },
    async (request) => {
      const account = request.account!;

      const invitations = await app.db
        .select({
          id: tenantInvitations.id,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
          role: tenantInvitations.role,
          inviterName: accounts.name,
          expiresAt: tenantInvitations.expiresAt,
        })
        .from(tenantInvitations)
        .innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
        .innerJoin(accounts, eq(tenantInvitations.invitedBy, accounts.id))
        .where(
          and(
            eq(tenantInvitations.email, account.email),
            eq(tenantInvitations.status, "pending"),
          ),
        );

      // Filter out expired
      const now = new Date();
      return {
        invitations: invitations.filter((inv) => inv.expiresAt > now),
      };
    },
  );

  // POST /tenants/invitations/accept — Accept an invitation (accountAuth)
  app.post(
    "/tenants/invitations/accept",
    { config: { accountAuth: true } },
    async (request, reply) => {
      const body = acceptSchema.parse(request.body);
      const account = request.account!;
      const tokenHash = hashToken(body.token);

      const [invitation] = await app.db
        .select({
          invitation: tenantInvitations,
          tenant: tenants,
        })
        .from(tenantInvitations)
        .innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
        .where(
          and(
            eq(tenantInvitations.tokenHash, tokenHash),
            eq(tenantInvitations.status, "pending"),
          ),
        )
        .limit(1);

      if (!invitation) {
        return reply.code(400).send({ error: "Invalid or expired invitation" });
      }

      if (invitation.invitation.expiresAt < new Date()) {
        return reply.code(400).send({ error: "Invitation has expired" });
      }

      if (account.email !== invitation.invitation.email) {
        return reply.code(403).send({ error: "This invitation was sent to a different email" });
      }

      // Check if already a member
      const existing = await app.db
        .select({ id: tenantMembers.id })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.accountId, account.id),
            eq(tenantMembers.tenantId, invitation.tenant.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Mark invitation as accepted anyway
        await app.db
          .update(tenantInvitations)
          .set({ status: "accepted" })
          .where(eq(tenantInvitations.id, invitation.invitation.id));
        return reply.code(409).send({ error: "Already a member of this workspace" });
      }

      // Create membership and mark invitation as accepted
      await app.db.insert(tenantMembers).values({
        accountId: account.id,
        tenantId: invitation.tenant.id,
        role: invitation.invitation.role,
      });

      await app.db
        .update(tenantInvitations)
        .set({ status: "accepted" })
        .where(eq(tenantInvitations.id, invitation.invitation.id));

      return reply.send({
        tenantId: invitation.tenant.id,
        role: invitation.invitation.role,
        tenantName: invitation.tenant.name,
        tenantSlug: invitation.tenant.slug,
      });
    },
  );
}
