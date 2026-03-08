import { GoogleGenAI } from "@google/genai";
import type { AiProviderAdapter, ChatMessage, AiEngineConfig, AiResponse, AiStreamChunk, ContentPart } from "../types";
import { AiEngineError } from "../errors";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiClient {
  models: {
    generateContent(params: {
      model: string;
      contents: Array<{ role: string; parts: GeminiPart[] }>;
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
        cachedContentTokenCount?: number;
      };
    }>;
  };
}

function mapParts(content: string | ContentPart[]): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];

  return content.map((part) => {
    if (part.type === "text") return { text: part.text };
    return { inlineData: { mimeType: part.mimeType, data: part.data } };
  });
}

function buildGeminiParams(messages: ChatMessage[], config: AiEngineConfig) {
  const thinkingConfig =
    config.thinking?.provider === "gemini" ? config.thinking.config : undefined;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: mapParts(m.content),
    }));

  return {
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
  };
}

export interface GeminiStreamClient {
  models: {
    generateContentStream(params: {
      model: string;
      contents: Array<{ role: string; parts: GeminiPart[] }>;
      config?: {
        systemInstruction?: string;
        temperature?: number;
        maxOutputTokens?: number;
        thinkingConfig?: { thinkingBudget?: number; thinkingLevel?: string };
      };
    }): Promise<AsyncIterable<{
      text?: string;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        cachedContentTokenCount?: number;
      };
    }>>;
  } & GeminiClient["models"];
}

export function createGeminiAdapter(client?: GeminiClient): AiProviderAdapter {
  return {
    async chat(messages: ChatMessage[], config: AiEngineConfig): Promise<AiResponse> {
      const gemini: GeminiClient = client ?? (new GoogleGenAI({ apiKey: config.apiKey }) as unknown as GeminiClient);

      try {
        const response = await gemini.models.generateContent(buildGeminiParams(messages, config));

        return {
          content: response.text ?? "",
          usage: response.usageMetadata
            ? {
                inputTokens: response.usageMetadata.promptTokenCount,
                outputTokens: response.usageMetadata.candidatesTokenCount,
                cachedInputTokens: response.usageMetadata.cachedContentTokenCount ?? undefined,
              }
            : undefined,
        };
      } catch (err) {
        throw new AiEngineError("Gemini API call failed", "gemini", err);
      }
    },

    async *chatStream(messages: ChatMessage[], config: AiEngineConfig): AsyncGenerator<AiStreamChunk> {
      const gemini: GeminiStreamClient = client as GeminiStreamClient ?? (new GoogleGenAI({ apiKey: config.apiKey }) as unknown as GeminiStreamClient);

      try {
        const stream = await gemini.models.generateContentStream(buildGeminiParams(messages, config));

        for await (const chunk of stream) {
          if (chunk.text) {
            yield { type: "text", content: chunk.text };
          }

          if (chunk.usageMetadata) {
            yield {
              type: "usage",
              usage: {
                inputTokens: chunk.usageMetadata.promptTokenCount,
                outputTokens: chunk.usageMetadata.candidatesTokenCount,
                cachedInputTokens: chunk.usageMetadata.cachedContentTokenCount ?? undefined,
              },
            };
          }
        }

        yield { type: "done" };
      } catch (err) {
        throw new AiEngineError("Gemini streaming call failed", "gemini", err);
      }
    },
  };
}
