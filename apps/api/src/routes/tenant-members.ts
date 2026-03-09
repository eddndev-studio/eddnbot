import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { tenantMembers, accounts } from "@eddnbot/db/schema";

async function getCallerRole(
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

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function tenantMemberRoutes(app: FastifyInstance) {
  // GET /tenants/members
  app.get("/tenants/members", async (request) => {
    const members = await app.db
      .select({
        id: tenantMembers.id,
        accountId: tenantMembers.accountId,
        email: accounts.email,
        name: accounts.name,
        role: tenantMembers.role,
        createdAt: tenantMembers.createdAt,
      })
      .from(tenantMembers)
      .innerJoin(accounts, eq(tenantMembers.accountId, accounts.id))
      .where(eq(tenantMembers.tenantId, request.tenant.id));

    return { members };
  });

  // PATCH /tenants/members/:memberId
  app.patch("/tenants/members/:memberId", async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const body = updateRoleSchema.parse(request.body);

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner") {
      return reply.code(403).send({ error: "Only owners can change roles" });
    }

    const [target] = await app.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.id, memberId),
          eq(tenantMembers.tenantId, request.tenant.id),
        ),
      )
      .limit(1);

    if (!target) {
      return reply.code(404).send({ error: "Member not found" });
    }

    if (target.role === "owner") {
      return reply.code(403).send({ error: "Cannot change owner role" });
    }

    const [updated] = await app.db
      .update(tenantMembers)
      .set({ role: body.role })
      .where(eq(tenantMembers.id, memberId))
      .returning();

    return updated;
  });

  // DELETE /tenants/members/:memberId
  app.delete("/tenants/members/:memberId", async (request, reply) => {
    const { memberId } = request.params as { memberId: string };

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can remove members" });
    }

    const [target] = await app.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.id, memberId),
          eq(tenantMembers.tenantId, request.tenant.id),
        ),
      )
      .limit(1);

    if (!target) {
      return reply.code(404).send({ error: "Member not found" });
    }

    if (target.role === "owner") {
      return reply.code(403).send({ error: "Cannot remove owner" });
    }

    if (callerRole === "admin" && target.role === "admin") {
      return reply.code(403).send({ error: "Admins cannot remove other admins" });
    }

    await app.db
      .delete(tenantMembers)
      .where(eq(tenantMembers.id, memberId));

    return reply.code(204).send();
  });
}
