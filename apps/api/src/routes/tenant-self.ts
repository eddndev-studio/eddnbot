import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { tenants, tenantMembers } from "@eddnbot/db/schema";

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
});

export async function tenantSelfRoutes(app: FastifyInstance) {
  // POST /tenants — Create a tenant (authenticated user becomes owner)
  app.post(
    "/tenants",
    { config: { accountAuth: true } },
    async (request, reply) => {
      const body = createTenantSchema.parse(request.body);
      const account = request.account!;

      try {
        const [tenant] = await app.db
          .insert(tenants)
          .values(body)
          .returning();

        await app.db.insert(tenantMembers).values({
          accountId: account.id,
          tenantId: tenant.id,
          role: "owner",
        });

        return reply.code(201).send(tenant);
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          return reply.code(409).send({ error: "Slug already exists" });
        }
        throw err;
      }
    },
  );
}
