import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { tenants } from "@eddnbot/db/schema";

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
});

export async function tenantRoutes(app: FastifyInstance) {
  app.post("/tenants", { config: { skipAuth: true } }, async (request, reply) => {
    const body = createTenantSchema.parse(request.body);

    try {
      const [tenant] = await app.db.insert(tenants).values(body).returning();
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
  });
}
