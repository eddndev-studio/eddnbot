import type { FastifyInstance } from "fastify";
import { getMediaByWaId, mediaFileExists, getMediaStream } from "../services/media-storage";

export async function mediaRoutes(app: FastifyInstance) {
  app.get(
    "/media/:mediaId",
    { config: { adminOnly: true } },
    async (request, reply) => {
      const { mediaId } = request.params as { mediaId: string };

      const record = await getMediaByWaId(app.db, mediaId);
      if (!record) {
        return reply.code(404).send({ error: "Media not found" });
      }

      const exists = await mediaFileExists(record.storagePath);
      if (!exists) {
        return reply.code(404).send({ error: "Media file missing from storage" });
      }

      const stream = getMediaStream(record.storagePath);

      return reply
        .header("Content-Type", record.mimeType)
        .header("Content-Length", record.fileSize)
        .header("Cache-Control", "private, max-age=86400, immutable")
        .header(
          "Content-Disposition",
          record.originalFilename
            ? `inline; filename="${record.originalFilename}"`
            : "inline",
        )
        .send(stream);
    },
  );
}
