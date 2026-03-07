export interface ModelCapabilities {
  maxOutputTokens: number;
  maxTemperature: number;
  thinking?:
    | { type: "effort"; options: string[]; default: string }
    | { type: "budget_tokens"; min: number; max: number; default: number }
    | { type: "thinking_budget"; min: number; max: number; default: number }
    | { type: "thinking_level"; options: string[]; default: string };
}

export interface ModelDefinition {
  id: string;
  provider: "openai" | "anthropic" | "gemini";
  name: string;
  capabilities: ModelCapabilities;
}

export type ThinkingConfig =
  | { provider: "openai"; config: { effort: string } }
  | { provider: "anthropic"; config: { budgetTokens: number } }
  | { provider: "gemini"; config: { thinkingBudget?: number; thinkingLevel?: string } };

export interface AiConfig {
  id: string;
  tenantId: string;
  label: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  systemPrompt: string | null;
  temperature: number | null;
  maxOutputTokens: number | null;
  thinkingConfig: ThinkingConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiConfig {
  label?: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingConfig?: ThinkingConfig;
}

export interface UpdateAiConfig {
  label?: string;
  provider?: "openai" | "anthropic" | "gemini";
  model?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  thinkingConfig?: ThinkingConfig | null;
}
