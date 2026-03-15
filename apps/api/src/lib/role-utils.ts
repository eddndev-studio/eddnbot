import type { FastifyInstance } from "fastify";
import { eq, and, inArray } from "drizzle-orm";
import { tenantMembers, whatsappAccountAssignments } from "@eddnbot/db/schema";

export async function getCallerRole(
  app: FastifyInstance,
  accountId: string,
  tenantId: string,
): Promise<string | null> {
  const [row] = await app.db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.accountId, accountId),
        eq(tenantMembers.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

export async function getCallerMembership(
  app: FastifyInstance,
  accountId: string,
  tenantId: string,
): Promise<{ memberId: string; role: string } | null> {
  const [row] = await app.db
    .select({ memberId: tenantMembers.id, role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.accountId, accountId),
        eq(tenantMembers.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getAssignedWaAccountIds(
  app: FastifyInstance,
  memberId: string,
): Promise<string[]> {
  const rows = await app.db
    .select({ waId: whatsappAccountAssignments.whatsappAccountId })
    .from(whatsappAccountAssignments)
    .where(eq(whatsappAccountAssignments.memberId, memberId));
  return rows.map((r) => r.waId);
}

export function isAdminOrOwner(role: string): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Resolves member restrictions for the current request.
 * Returns null if caller is API-key-authed or owner/admin (no restrictions).
 * Returns string[] of assigned WA account IDs for members.
 */
export async function resolveMemberWaFilter(
  app: FastifyInstance,
  account: { id: string } | null,
  tenantId: string,
): Promise<string[] | null> {
  // API key auth — no account, no restrictions
  if (!account) return null;

  const membership = await getCallerMembership(app, account.id, tenantId);
  if (!membership) return null;

  if (isAdminOrOwner(membership.role)) return null;

  return getAssignedWaAccountIds(app, membership.memberId);
}
