export { createAiEngine, type CreateEngineOptions } from "./engine";
export type {
  AiProvider,
  AiProviderAdapter,
  AiEngineConfig,
  AiResponse,
  ChatMessage,
  MessageRole,
  ThinkingConfig,
  OpenAiThinkingConfig,
  AnthropicThinkingConfig,
  GeminiThinkingConfig,
} from "./types";
export type {
  TranscriptionAdapter,
  TranscriptionConfig,
  TranscriptionResponse,
  TranscriptionSegment,
} from "./transcription-types";
export { createWhisperAdapter } from "./providers/whisper";
export { AiEngineError, AiProviderNotFoundError } from "./errors";
export {
  MODEL_REGISTRY,
  getModelsByProvider,
  getModelById,
  type ModelDefinition,
  type ModelCapabilities,
} from "./model-registry";
