import type { AiProvider } from "./types";

export interface ModelCapabilities {
  maxOutputTokens: number;
  maxTemperature: number;
  vision?: boolean;
  thinking?:
    | { type: "effort"; options: string[]; default: string }
    | { type: "budget_tokens"; min: number; max: number; default: number }
    | { type: "thinking_budget"; min: number; max: number; default: number }
    | { type: "thinking_level"; options: string[]; default: string };
}

export interface ModelDefinition {
  id: string;
  provider: AiProvider;
  name: string;
  capabilities: ModelCapabilities;
}

export const MODEL_REGISTRY: ModelDefinition[] = [
  // OpenAI — non-reasoning
  { id: "gpt-4o", provider: "openai", name: "GPT-4o", capabilities: { maxOutputTokens: 16384, maxTemperature: 2, vision: true } },
  { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini", capabilities: { maxOutputTokens: 16384, maxTemperature: 2, vision: true } },
  { id: "gpt-4.1", provider: "openai", name: "GPT-4.1", capabilities: { maxOutputTokens: 32768, maxTemperature: 2, vision: true } },
  { id: "gpt-4.1-mini", provider: "openai", name: "GPT-4.1 Mini", capabilities: { maxOutputTokens: 32768, maxTemperature: 2, vision: true } },
  { id: "gpt-4.1-nano", provider: "openai", name: "GPT-4.1 Nano", capabilities: { maxOutputTokens: 32768, maxTemperature: 2, vision: true } },
  // OpenAI — reasoning
  { id: "o3", provider: "openai", name: "o3", capabilities: { maxOutputTokens: 100000, maxTemperature: 1, vision: true, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "o3-mini", provider: "openai", name: "o3 Mini", capabilities: { maxOutputTokens: 65536, maxTemperature: 1, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "o4-mini", provider: "openai", name: "o4 Mini", capabilities: { maxOutputTokens: 100000, maxTemperature: 1, vision: true, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gpt-5", provider: "openai", name: "GPT-5", capabilities: { maxOutputTokens: 128000, maxTemperature: 2, vision: true, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gpt-5-mini", provider: "openai", name: "GPT-5 Mini", capabilities: { maxOutputTokens: 128000, maxTemperature: 2, vision: true, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gpt-5-nano", provider: "openai", name: "GPT-5 Nano", capabilities: { maxOutputTokens: 128000, maxTemperature: 2, vision: true, thinking: { type: "effort", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gpt-5.2", provider: "openai", name: "GPT-5.2", capabilities: { maxOutputTokens: 128000, maxTemperature: 2, vision: true, thinking: { type: "effort", options: ["none", "low", "medium", "high", "xhigh"], default: "medium" } } },

  // Anthropic (all vision-capable)
  { id: "claude-opus-4-6", provider: "anthropic", name: "Claude Opus 4.6", capabilities: { maxOutputTokens: 128000, maxTemperature: 1, vision: true, thinking: { type: "budget_tokens", min: 1024, max: 128000, default: 10000 } } },
  { id: "claude-sonnet-4-6", provider: "anthropic", name: "Claude Sonnet 4.6", capabilities: { maxOutputTokens: 64000, maxTemperature: 1, vision: true, thinking: { type: "budget_tokens", min: 1024, max: 64000, default: 10000 } } },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic", name: "Claude Haiku 4.5", capabilities: { maxOutputTokens: 64000, maxTemperature: 1, vision: true, thinking: { type: "budget_tokens", min: 1024, max: 64000, default: 10000 } } },
  { id: "claude-sonnet-4-20250514", provider: "anthropic", name: "Claude Sonnet 4", capabilities: { maxOutputTokens: 64000, maxTemperature: 1, vision: true, thinking: { type: "budget_tokens", min: 1024, max: 64000, default: 10000 } } },

  // Gemini — 2.x (all vision-capable)
  { id: "gemini-2.5-flash", provider: "gemini", name: "Gemini 2.5 Flash", capabilities: { maxOutputTokens: 65536, maxTemperature: 2, vision: true, thinking: { type: "thinking_budget", min: 0, max: 24576, default: 8192 } } },
  { id: "gemini-2.5-pro", provider: "gemini", name: "Gemini 2.5 Pro", capabilities: { maxOutputTokens: 65536, maxTemperature: 2, vision: true, thinking: { type: "thinking_budget", min: 0, max: 65536, default: 8192 } } },
  { id: "gemini-2.0-flash", provider: "gemini", name: "Gemini 2.0 Flash", capabilities: { maxOutputTokens: 8192, maxTemperature: 2, vision: true } },
  // Gemini — 3.x
  { id: "gemini-3-flash-preview", provider: "gemini", name: "Gemini 3 Flash", capabilities: { maxOutputTokens: 64000, maxTemperature: 2, vision: true, thinking: { type: "thinking_level", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gemini-3.1-pro-preview", provider: "gemini", name: "Gemini 3.1 Pro", capabilities: { maxOutputTokens: 64000, maxTemperature: 2, vision: true, thinking: { type: "thinking_level", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gemini-3.1-flash-lite-preview", provider: "gemini", name: "Gemini 3.1 Flash Lite", capabilities: { maxOutputTokens: 64000, maxTemperature: 2, vision: true, thinking: { type: "thinking_level", options: ["low", "medium", "high"], default: "medium" } } },
  { id: "gemini-3.1-pro-preview-customtools", provider: "gemini", name: "Gemini 3.1 Pro Custom Tools", capabilities: { maxOutputTokens: 64000, maxTemperature: 2, vision: true, thinking: { type: "thinking_level", options: ["low", "medium", "high"], default: "medium" } } },
];

export function getModelsByProvider(provider: AiProvider): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function modelSupportsVision(modelId: string): boolean {
  const model = getModelById(modelId);
  return model?.capabilities.vision === true;
}
