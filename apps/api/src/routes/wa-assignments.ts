import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { whatsappAccountAssignments, whatsappAccounts, tenantMembers } from "@eddnbot/db/schema";
import { getCallerRole } from "../lib/role-utils";

const createSchema = z.object({
  whatsappAccountId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export async function waAssignmentRoutes(app: FastifyInstance) {
  // POST /tenants/wa-assignments — Assign WA account to member
  app.post("/tenants/wa-assignments", async (request, reply) => {
    const body = createSchema.parse(request.body);

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can manage assignments" });
    }

    // Verify WA account belongs to tenant
    const [waAccount] = await app.db
      .select({ id: whatsappAccounts.id })
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, body.whatsappAccountId),
          eq(whatsappAccounts.tenantId, request.tenant.id),
        ),
      );

    if (!waAccount) {
      return reply.code(404).send({ error: "WhatsApp account not found" });
    }

    // Verify member belongs to tenant and has role "member"
    const [member] = await app.db
      .select({ id: tenantMembers.id, role: tenantMembers.role })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.id, body.memberId),
          eq(tenantMembers.tenantId, request.tenant.id),
        ),
      );

    if (!member) {
      return reply.code(404).send({ error: "Member not found" });
    }

    if (member.role !== "member") {
      return reply.code(422).send({ error: "Assignments can only be created for members, not owners or admins" });
    }

    try {
      const [assignment] = await app.db
        .insert(whatsappAccountAssignments)
        .values({
          whatsappAccountId: body.whatsappAccountId,
          memberId: body.memberId,
          assignedBy: request.account!.id,
        })
        .returning();

      return reply.code(201).send(assignment);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ error: "Assignment already exists" });
      }
      throw err;
    }
  });

  // GET /tenants/wa-assignments — List assignments
  app.get("/tenants/wa-assignments", async (request) => {
    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);

    // Build query for assignments belonging to this tenant's WA accounts
    const rows = await app.db
      .select({
        id: whatsappAccountAssignments.id,
        whatsappAccountId: whatsappAccountAssignments.whatsappAccountId,
        memberId: whatsappAccountAssignments.memberId,
        assignedBy: whatsappAccountAssignments.assignedBy,
        assignedAt: whatsappAccountAssignments.assignedAt,
        waPhoneNumberId: whatsappAccounts.phoneNumberId,
        waDisplayPhone: whatsappAccounts.displayPhoneNumber,
      })
      .from(whatsappAccountAssignments)
      .innerJoin(whatsappAccounts, eq(whatsappAccountAssignments.whatsappAccountId, whatsappAccounts.id))
      .innerJoin(tenantMembers, eq(whatsappAccountAssignments.memberId, tenantMembers.id))
      .where(eq(whatsappAccounts.tenantId, request.tenant.id));

    // Members see only their own assignments
    if (callerRole === "member") {
      const [membership] = await app.db
        .select({ id: tenantMembers.id })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.accountId, request.account!.id),
            eq(tenantMembers.tenantId, request.tenant.id),
          ),
        )
        .limit(1);

      const filtered = membership
        ? rows.filter((r) => r.memberId === membership.id)
        : [];
      return { assignments: filtered };
    }

    return { assignments: rows };
  });

  // DELETE /tenants/wa-assignments/:assignmentId — Remove assignment
  app.delete("/tenants/wa-assignments/:assignmentId", async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };

    const callerRole = await getCallerRole(app, request.account!.id, request.tenant.id);
    if (callerRole !== "owner" && callerRole !== "admin") {
      return reply.code(403).send({ error: "Only owners or admins can manage assignments" });
    }

    // Verify assignment belongs to this tenant via WA account
    const [assignment] = await app.db
      .select({ id: whatsappAccountAssignments.id })
      .from(whatsappAccountAssignments)
      .innerJoin(whatsappAccounts, eq(whatsappAccountAssignments.whatsappAccountId, whatsappAccounts.id))
      .where(
        and(
          eq(whatsappAccountAssignments.id, assignmentId),
          eq(whatsappAccounts.tenantId, request.tenant.id),
        ),
      );

    if (!assignment) {
      return reply.code(404).send({ error: "Assignment not found" });
    }

    await app.db
      .delete(whatsappAccountAssignments)
      .where(eq(whatsappAccountAssignments.id, assignmentId));

    return reply.code(204).send();
  });
}
