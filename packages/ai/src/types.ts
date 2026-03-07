export type AiProvider = "openai" | "anthropic" | "gemini";

export type MessageRole = "system" | "user" | "assistant";

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image";
  mimeType: string;
  data: string; // base64-encoded
}

export type ContentPart = TextPart | ImagePart;

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentPart[];
}

export interface OpenAiThinkingConfig {
  effort: "low" | "medium" | "high";
}

export interface AnthropicThinkingConfig {
  budgetTokens: number;
}

export interface GeminiThinkingConfig {
  thinkingBudget?: number;
  thinkingLevel?: string;
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

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

export interface AiResponse {
  content: string;
  thinkingContent?: string;
  usage?: AiUsage;
  finishReason?: string;
}

export interface AiStreamChunk {
  type: "text" | "thinking" | "usage" | "done";
  content?: string;
  usage?: AiUsage;
  finishReason?: string;
}

export interface AiProviderAdapter {
  chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse>;
  chatStream(messages: ChatMessage[], config: AiEngineConfig): AsyncGenerator<AiStreamChunk>;
}

/** Extract text from content, whether string or ContentPart[]. */
export function contentToString(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/** Normalize content to ContentPart[]. */
export function normalizeContent(content: string | ContentPart[]): ContentPart[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return content;
}
