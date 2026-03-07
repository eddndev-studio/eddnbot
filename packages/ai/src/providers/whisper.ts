import OpenAI from "openai";
import type {
  TranscriptionAdapter,
  TranscriptionConfig,
  TranscriptionResponse,
} from "../transcription-types";
import { AiEngineError } from "../errors";

export function createWhisperAdapter(client?: OpenAI): TranscriptionAdapter {
  return {
    async transcribe(
      file: Buffer,
      fileName: string,
      config: TranscriptionConfig,
    ): Promise<TranscriptionResponse> {
      const openai = client ?? new OpenAI({ apiKey: config.apiKey });

      try {
        const response = await openai.audio.transcriptions.create({
          file: new File([new Uint8Array(file) as Uint8Array<ArrayBuffer>], fileName),
          model: config.model,
          language: config.language,
          prompt: config.prompt,
          temperature: config.temperature,
          response_format: config.responseFormat,
        });

        // When response_format is verbose_json, the response includes extra fields
        const result = response as unknown as Record<string, unknown>;

        return {
          text: typeof result.text === "string" ? result.text : String(result),
          duration: result.duration as number | undefined,
          language: result.language as string | undefined,
          segments: result.segments as TranscriptionResponse["segments"],
        };
      } catch (err) {
        throw new AiEngineError("Whisper API call failed", "whisper", err);
      }
    },
  };
}
