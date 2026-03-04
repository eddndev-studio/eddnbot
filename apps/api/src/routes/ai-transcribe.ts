import type { FastifyInstance } from "fastify";
import { createWhisperAdapter } from "@eddnbot/ai";
import type { TranscriptionConfig } from "@eddnbot/ai";
import { checkQuota, trackAiTokens } from "../services/usage-tracker";

const ALLOWED_EXTENSIONS = new Set(["flac", "mp3", "mp4", "m4a", "ogg", "wav", "webm"]);
const ALLOWED_MODELS = new Set(["whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function aiTranscribeRoutes(app: FastifyInstance) {
  app.post("/ai/transcribe", async (request, reply) => {
    const apiKey = app.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reply.code(422).send({ error: "Missing OPENAI_API_KEY" });
    }

    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    // Check file size
    const fileBuffer = await data.toBuffer();
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return reply.code(413).send({ error: "File too large. Maximum size is 25 MB" });
    }

    // Validate extension
    const fileName = data.filename;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply.code(400).send({
        error: `Unsupported audio format: .${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      });
    }

    // Parse optional fields
    const fields = data.fields;
    const model = getFieldValue(fields, "model") ?? "whisper-1";
    const language = getFieldValue(fields, "language");
    const prompt = getFieldValue(fields, "prompt");
    const temperatureStr = getFieldValue(fields, "temperature");
    const responseFormat = getFieldValue(fields, "response_format") as
      | TranscriptionConfig["responseFormat"]
      | undefined;

    if (!ALLOWED_MODELS.has(model)) {
      return reply.code(400).send({
        error: `Unsupported model: ${model}. Allowed: ${[...ALLOWED_MODELS].join(", ")}`,
      });
    }

    const config: TranscriptionConfig = {
      apiKey,
      model,
      ...(language && { language }),
      ...(prompt && { prompt }),
      ...(temperatureStr && { temperature: parseFloat(temperatureStr) }),
      ...(responseFormat && { responseFormat }),
    };

    // Check AI token quota
    const quotaCheck = await checkQuota(app.db, app.redis, request.tenant.id, "ai_tokens");
    if (!quotaCheck.allowed) {
      return reply.code(429).send({
        error: `Monthly ai_tokens quota exceeded (${quotaCheck.current}/${quotaCheck.limit})`,
      });
    }

    const adapter = createWhisperAdapter();
    const result = await adapter.transcribe(fileBuffer, fileName, config);

    // Track transcription as AI token usage (estimate based on audio duration)
    await trackAiTokens(app.db, app.redis, request.tenant.id, {
      provider: "openai",
      model,
      inputTokens: 0,
      outputTokens: result.text?.length ?? 0,
    });

    return result;
  });
}

function getFieldValue(
  fields: Record<string, unknown>,
  name: string,
): string | undefined {
  const field = fields[name] as { value?: string } | undefined;
  return field?.value;
}
