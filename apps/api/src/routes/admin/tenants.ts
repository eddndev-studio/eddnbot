import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, ilike, and } from "drizzle-orm";
import { tenants } from "@eddnbot/db/schema";

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  isActive: z.boolean().optional(),
});

const adminConfig = { config: { adminOnly: true } };

export async function adminTenantRoutes(app: FastifyInstance) {
  // POST /admin/tenants — Create tenant
  app.post("/admin/tenants", adminConfig, async (request, reply) => {
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

  // GET /admin/tenants — List all tenants
  app.get("/admin/tenants", adminConfig, async (request) => {
    const query = request.query as Record<string, string>;
    const conditions = [];

    if (query.search) {
      conditions.push(ilike(tenants.name, `%${query.search}%`));
    }
    if (query.active === "true") {
      conditions.push(eq(tenants.isActive, true));
    } else if (query.active === "false") {
      conditions.push(eq(tenants.isActive, false));
    }

    const rows = await app.db
      .select()
      .from(tenants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tenants.createdAt);

    return { tenants: rows };
  });

  // GET /admin/tenants/:tenantId — Tenant detail
  app.get("/admin/tenants/:tenantId", adminConfig, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    const [tenant] = await app.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    return tenant;
  });

  // PATCH /admin/tenants/:tenantId — Update tenant
  app.patch("/admin/tenants/:tenantId", adminConfig, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = updateTenantSchema.parse(request.body);

    try {
      const [updated] = await app.db
        .update(tenants)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Tenant not found" });
      }

      return updated;
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

  // DELETE /admin/tenants/:tenantId — Delete tenant
  app.delete("/admin/tenants/:tenantId", adminConfig, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    const [deleted] = await app.db
      .delete(tenants)
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!deleted) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    return reply.code(204).send();
  });
}
