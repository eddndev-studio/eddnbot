import { describe, it, expect, vi } from "vitest";
import { createGeminiAdapter, type GeminiClient } from "../../providers/gemini";
import type { AiEngineConfig, ChatMessage } from "../../types";
import { AiEngineError } from "../../errors";

function mockGeminiClient(response: unknown): GeminiClient {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue(response),
    },
  };
}

const baseConfig: AiEngineConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  apiKey: "gemini-test",
  temperature: 0.7,
  maxOutputTokens: 1000,
};

const userMessage: ChatMessage[] = [{ role: "user", content: "Hi" }];

describe("Gemini adapter", () => {
  it("sends messages and returns content", async () => {
    const client = mockGeminiClient({
      text: "Hello!",
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    });

    const adapter = createGeminiAdapter(client);
    const result = await adapter.chat(userMessage, baseConfig);

    expect(result.content).toBe("Hello!");
    expect(result.usage?.inputTokens).toBe(10);
    expect(result.usage?.outputTokens).toBe(5);
  });

  it("maps assistant role to model", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    const messages: ChatMessage[] = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "How?" },
    ];
    await adapter.chat(messages, baseConfig);

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.contents[0].role).toBe("user");
    expect(call.contents[1].role).toBe("model");
    expect(call.contents[2].role).toBe("user");
  });

  it("filters out system messages from contents", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "Hi" },
    ];
    await adapter.chat(messages, baseConfig);

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.contents).toHaveLength(1);
    expect(call.contents[0].role).toBe("user");
  });

  it("passes systemInstruction in config", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    await adapter.chat(userMessage, { ...baseConfig, systemPrompt: "Be helpful" });

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config.systemInstruction).toBe("Be helpful");
  });

  it("passes thinkingConfig when thinking budget is set", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    await adapter.chat(userMessage, {
      ...baseConfig,
      thinking: { provider: "gemini", config: { thinkingBudget: 2048 } },
    });

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config.thinkingConfig).toEqual({ thinkingBudget: 2048 });
  });

  it("does not pass thinkingConfig when budget is 0", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    await adapter.chat(userMessage, {
      ...baseConfig,
      thinking: { provider: "gemini", config: { thinkingBudget: 0 } },
    });

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config.thinkingConfig).toBeUndefined();
  });

  it("passes temperature and maxOutputTokens", async () => {
    const client = mockGeminiClient({ text: "OK" });

    const adapter = createGeminiAdapter(client);
    await adapter.chat(userMessage, baseConfig);

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config.temperature).toBe(0.7);
    expect(call.config.maxOutputTokens).toBe(1000);
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockGeminiClient(undefined);
    (client.models.generateContent as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API error"),
    );

    const adapter = createGeminiAdapter(client);

    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(AiEngineError);
    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(
      "Gemini API call failed",
    );
  });
});
