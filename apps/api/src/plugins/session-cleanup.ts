import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { and, eq, lt } from "drizzle-orm";
import { chatSessions } from "@eddnbot/db/schema";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export const sessionCleanupPlugin = fp(async (app: FastifyInstance) => {
  async function expireSessions() {
    try {
      const result = await app.db
        .update(chatSessions)
        .set({ status: "expired" })
        .where(
          and(
            eq(chatSessions.status, "active"),
            lt(chatSessions.expiresAt, new Date()),
          ),
        )
        .returning({ id: chatSessions.id });

      if (result.length > 0) {
        app.log.info(`Expired ${result.length} chat sessions`);
      }
    } catch (err) {
      app.log.error({ err }, "Session cleanup failed");
    }
  }

  // Run once on startup to catch any sessions that expired while the server was down
  await expireSessions();

  const timer = setInterval(expireSessions, CLEANUP_INTERVAL_MS);

  app.addHook("onClose", () => {
    clearInterval(timer);
  });
});
