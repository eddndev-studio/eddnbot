import OpenAI from "openai";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse, ContentPart } from "../types";
import { AiEngineError } from "../errors";

type OpenAiContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

function mapContent(content: string | ContentPart[]): OpenAiContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") return { type: "text" as const, text: part.text };
    return {
      type: "image_url" as const,
      image_url: { url: `data:${part.mimeType};base64,${part.data}` },
    };
  });
}

export function createOpenAiAdapter(client?: OpenAI): AiProviderAdapter {
  return {
    async chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse> {
      const openai = client ?? new OpenAI({ apiKey: config.apiKey });

      const thinkingConfig =
        config.thinking?.provider === "openai" ? config.thinking.config : undefined;

      try {
        const systemMessages = config.systemPrompt
          ? [{ role: "system" as const, content: config.systemPrompt }]
          : [];

        const response = await openai.chat.completions.create({
          model: config.model,
          messages: [
            ...systemMessages,
            ...messages.map((m) => ({
              role: m.role,
              content: mapContent(m.content),
            })),
          ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: config.temperature,
          max_completion_tokens: config.maxOutputTokens,
          ...(thinkingConfig ? { reasoning_effort: thinkingConfig.effort } : {}),
        });

        const choice = response.choices[0];

        const cachedTokens = (
          response.usage as unknown as { prompt_tokens_details?: { cached_tokens?: number } }
        )?.prompt_tokens_details?.cached_tokens;

        return {
          content: choice?.message?.content ?? "",
          usage: response.usage
            ? {
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens,
                cachedInputTokens: cachedTokens ?? undefined,
              }
            : undefined,
          finishReason: choice?.finish_reason ?? undefined,
        };
      } catch (err) {
        throw new AiEngineError("OpenAI API call failed", "openai", err);
      }
    },
  };
}
