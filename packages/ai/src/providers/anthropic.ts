import Anthropic from "@anthropic-ai/sdk";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse } from "../types";
import { AiEngineError } from "../errors";

export function createAnthropicAdapter(client?: Anthropic): AiProviderAdapter {
  return {
    async chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse> {
      const anthropic = client ?? new Anthropic({ apiKey: config.apiKey });

      const thinkingConfig =
        config.thinking?.provider === "anthropic" ? config.thinking.config : undefined;
      const thinkingEnabled = thinkingConfig != null && thinkingConfig.budgetTokens > 0;

      try {
        const response = await anthropic.messages.create({
          model: config.model,
          system: config.systemPrompt,
          messages: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
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
        });

        const textBlock = response.content.find((b) => b.type === "text");
        const thinkingBlock = response.content.find((b) => b.type === "thinking");

        return {
          content: textBlock?.type === "text" ? textBlock.text : "",
          thinkingContent:
            thinkingBlock?.type === "thinking" ? thinkingBlock.thinking : undefined,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          finishReason: response.stop_reason ?? undefined,
        };
      } catch (err) {
        throw new AiEngineError("Anthropic API call failed", "anthropic", err);
      }
    },
  };
}
