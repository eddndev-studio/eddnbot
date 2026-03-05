import type { FastifyInstance } from "fastify";

export async function adminAuthRoutes(app: FastifyInstance) {
  app.get("/admin/auth/verify", { config: { adminOnly: true } }, async () => {
    return { ok: true };
  });
}
