import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/health/ready", async (_request, reply) => {
    try {
      await app.db.execute(sql`SELECT 1`);
      return { status: "ready", services: { database: "connected" } };
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        services: { database: "disconnected" },
      });
    }
  });
}
