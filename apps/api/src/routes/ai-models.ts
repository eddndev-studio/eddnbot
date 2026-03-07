import type { FastifyInstance } from "fastify";
import { MODEL_REGISTRY, getModelsByProvider } from "@eddnbot/ai";
import type { AiProvider } from "@eddnbot/ai";

export async function aiModelRoutes(app: FastifyInstance) {
  // GET /ai/models
  app.get("/ai/models", async (request) => {
    const query = request.query as Record<string, string>;

    if (query.provider) {
      return getModelsByProvider(query.provider as AiProvider);
    }

    return MODEL_REGISTRY;
  });
}
