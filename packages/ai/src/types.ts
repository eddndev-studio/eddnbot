export type AiProvider = "openai" | "anthropic" | "gemini";

export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface OpenAiThinkingConfig {
  effort: "low" | "medium" | "high";
}

export interface AnthropicThinkingConfig {
  budgetTokens: number;
}

export interface GeminiThinkingConfig {
  thinkingBudget: number;
}

export type ThinkingConfig =
  | { provider: "openai"; config: OpenAiThinkingConfig }
  | { provider: "anthropic"; config: AnthropicThinkingConfig }
  | { provider: "gemini"; config: GeminiThinkingConfig };

export interface AiEngineConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  thinking?: ThinkingConfig;
}

export interface AiResponse {
  content: string;
  thinkingContent?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  finishReason?: string;
}

export interface AiProviderAdapter {
  chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse>;
}
