import Anthropic from "@anthropic-ai/sdk";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse, AiStreamChunk, ContentPart } from "../types";
import { AiEngineError } from "../errors";

type AnthropicContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
>;

function mapContent(content: string | ContentPart[]): AnthropicContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") return { type: "text" as const, text: part.text };
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: part.mimeType,
        data: part.data,
      },
    };
  });
}

function buildAnthropicParams(messages: ChatMessage[], config: AiEngineConfig) {
  const thinkingConfig =
    config.thinking?.provider === "anthropic" ? config.thinking.config : undefined;
  const thinkingEnabled = thinkingConfig != null && thinkingConfig.budgetTokens > 0;

  return {
    model: config.model,
    system: config.systemPrompt
      ? [{ type: "text" as const, text: config.systemPrompt, cache_control: { type: "ephemeral" as const } }]
      : undefined,
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: mapContent(m.content),
      })),
    temperature: thinkingEnabled ? 1.0 : config.temperature,
    max_tokens: config.maxOutputTokens ?? 4096,
    ...(thinkingEnabled
      ? {
          thinking: {
            type: "enabled" as const,
            budget_tokens: thinkingConfig.budgetTokens,
          },
        }
      : {}),
  };
}

export function createAnthropicAdapter(client?: Anthropic): AiProviderAdapter {
  return {
    async chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse> {
      const anthropic = client ?? new Anthropic({ apiKey: config.apiKey });

      try {
        const response = await anthropic.messages.create(
          buildAnthropicParams(messages, config) as Anthropic.MessageCreateParamsNonStreaming,
        );

        const textBlock = response.content.find((b) => b.type === "text");
        const thinkingBlock = response.content.find((b) => b.type === "thinking");

        const cacheUsage = response.usage as unknown as {
          cache_read_input_tokens?: number;
          cache_creation_input_tokens?: number;
        };
        const cachedTokens =
          (cacheUsage.cache_read_input_tokens ?? 0) + (cacheUsage.cache_creation_input_tokens ?? 0);

        return {
          content: textBlock?.type === "text" ? textBlock.text : "",
          thinkingContent:
            thinkingBlock?.type === "thinking" ? thinkingBlock.thinking : undefined,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cachedInputTokens: cachedTokens || undefined,
          },
          finishReason: response.stop_reason ?? undefined,
        };
      } catch (err) {
        throw new AiEngineError("Anthropic API call failed", "anthropic", err);
      }
    },

    async *chatStream(messages: ChatMessage[], config: AiEngineConfig): AsyncGenerator<AiStreamChunk> {
      const anthropic = client ?? new Anthropic({ apiKey: config.apiKey });

      try {
        const stream = anthropic.messages.stream(
          buildAnthropicParams(messages, config) as Anthropic.MessageStreamParams,
        );

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              yield { type: "text", content: event.delta.text };
            } else if (event.delta.type === "thinking_delta") {
              yield { type: "thinking", content: event.delta.thinking };
            }
          }

          if (event.type === "message_delta") {
            if (event.usage) {
              yield {
                type: "usage",
                usage: { outputTokens: event.usage.output_tokens },
              };
            }
            if (event.delta.stop_reason) {
              yield { type: "done", finishReason: event.delta.stop_reason };
            }
          }

          if (event.type === "message_start" && event.message.usage) {
            const cacheUsage = event.message.usage as unknown as {
              cache_read_input_tokens?: number;
              cache_creation_input_tokens?: number;
            };
            const cachedTokens =
              (cacheUsage.cache_read_input_tokens ?? 0) + (cacheUsage.cache_creation_input_tokens ?? 0);

            yield {
              type: "usage",
              usage: {
                inputTokens: event.message.usage.input_tokens,
                cachedInputTokens: cachedTokens || undefined,
              },
            };
          }
        }
      } catch (err) {
        throw new AiEngineError("Anthropic streaming call failed", "anthropic", err);
      }
    },
  };
}
