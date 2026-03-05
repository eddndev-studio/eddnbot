export interface AiConfig {
  id: string;
  tenantId: string;
  label: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  systemPrompt: string | null;
  temperature: number | null;
  maxOutputTokens: number | null;
  thinkingConfig: Record<string, unknown> | null;
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
  thinkingConfig?: Record<string, unknown>;
}

export interface UpdateAiConfig {
  label?: string;
  provider?: "openai" | "anthropic" | "gemini";
  model?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  thinkingConfig?: Record<string, unknown> | null;
}
