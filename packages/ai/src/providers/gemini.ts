import { GoogleGenAI } from "@google/genai";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse } from "../types";
import { AiEngineError } from "../errors";

export interface GeminiClient {
  models: {
    generateContent(params: {
      model: string;
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      config?: {
        systemInstruction?: string;
        temperature?: number;
        maxOutputTokens?: number;
        thinkingConfig?: { thinkingBudget?: number; thinkingLevel?: string };
      };
    }): Promise<{
      text?: string;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    }>;
  };
}

export function createGeminiAdapter(client?: GeminiClient): AiProviderAdapter {
  return {
    async chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse> {
      const gemini = client ?? new GoogleGenAI({ apiKey: config.apiKey });

      const thinkingConfig =
        config.thinking?.provider === "gemini" ? config.thinking.config : undefined;

      try {
        const contents = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const response = await gemini.models.generateContent({
          model: config.model,
          contents,
          config: {
            systemInstruction: config.systemPrompt,
            temperature: config.temperature,
            maxOutputTokens: config.maxOutputTokens,
            ...(thinkingConfig?.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: thinkingConfig.thinkingLevel } }
              : thinkingConfig?.thinkingBudget && thinkingConfig.thinkingBudget > 0
                ? { thinkingConfig: { thinkingBudget: thinkingConfig.thinkingBudget } }
                : {}),
          },
        });

        return {
          content: response.text ?? "",
          usage: response.usageMetadata
            ? {
                inputTokens: response.usageMetadata.promptTokenCount,
                outputTokens: response.usageMetadata.candidatesTokenCount,
              }
            : undefined,
        };
      } catch (err) {
        throw new AiEngineError("Gemini API call failed", "gemini", err);
      }
    },
  };
}
