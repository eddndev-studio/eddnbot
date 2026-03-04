import type { AiProvider, AiProviderAdapter } from "./types";
import { AiProviderNotFoundError } from "./errors";
import { createOpenAiAdapter } from "./providers/openai";
import { createAnthropicAdapter } from "./providers/anthropic";
import { createGeminiAdapter } from "./providers/gemini";

export interface CreateEngineOptions {
  provider: AiProvider;
  client?: unknown;
}

export function createAiEngine(options: CreateEngineOptions): AiProviderAdapter {
  switch (options.provider) {
    case "openai":
      return createOpenAiAdapter(options.client as never);
    case "anthropic":
      return createAnthropicAdapter(options.client as never);
    case "gemini":
      return createGeminiAdapter(options.client as never);
    default:
      throw new AiProviderNotFoundError(options.provider as string);
  }
}
