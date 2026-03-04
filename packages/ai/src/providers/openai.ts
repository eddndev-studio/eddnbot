import OpenAI from "openai";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse } from "../types";
import { AiEngineError } from "../errors";

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
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: config.temperature,
          max_completion_tokens: config.maxOutputTokens,
          ...(thinkingConfig ? { reasoning_effort: thinkingConfig.effort } : {}),
        });

        const choice = response.choices[0];

        return {
          content: choice?.message?.content ?? "",
          usage: response.usage
            ? {
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens,
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
