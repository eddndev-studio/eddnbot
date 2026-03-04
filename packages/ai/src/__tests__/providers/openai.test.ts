import { describe, it, expect, vi } from "vitest";
import { createOpenAiAdapter } from "../../providers/openai";
import type { AiEngineConfig, ChatMessage } from "../../types";
import { AiEngineError } from "../../errors";

function mockOpenAiClient(response: unknown) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(response),
      },
    },
  };
}

const baseConfig: AiEngineConfig = {
  provider: "openai",
  model: "gpt-4o",
  apiKey: "sk-test",
  temperature: 0.7,
  maxOutputTokens: 1000,
};

const userMessage: ChatMessage[] = [{ role: "user", content: "Hi" }];

describe("OpenAI adapter", () => {
  it("sends messages and returns content", async () => {
    const client = mockOpenAiClient({
      choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });

    const adapter = createOpenAiAdapter(client as never);
    const result = await adapter.chat(userMessage, baseConfig);

    expect(result.content).toBe("Hello!");
    expect(result.usage?.inputTokens).toBe(10);
    expect(result.usage?.outputTokens).toBe(5);
    expect(result.finishReason).toBe("stop");
  });

  it("includes system prompt as system message", async () => {
    const client = mockOpenAiClient({
      choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
    });

    const adapter = createOpenAiAdapter(client as never);
    await adapter.chat(userMessage, { ...baseConfig, systemPrompt: "Be helpful" });

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.messages[0]).toEqual({ role: "system", content: "Be helpful" });
    expect(call.messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  it("passes temperature and max_completion_tokens", async () => {
    const client = mockOpenAiClient({
      choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
    });

    const adapter = createOpenAiAdapter(client as never);
    await adapter.chat(userMessage, baseConfig);

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.temperature).toBe(0.7);
    expect(call.max_completion_tokens).toBe(1000);
  });

  it("passes reasoning_effort when thinking config is set", async () => {
    const client = mockOpenAiClient({
      choices: [{ message: { content: "Thought" }, finish_reason: "stop" }],
    });

    const adapter = createOpenAiAdapter(client as never);
    await adapter.chat(userMessage, {
      ...baseConfig,
      thinking: { provider: "openai", config: { effort: "high" } },
    });

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.reasoning_effort).toBe("high");
  });

  it("does not pass reasoning_effort when no thinking config", async () => {
    const client = mockOpenAiClient({
      choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
    });

    const adapter = createOpenAiAdapter(client as never);
    await adapter.chat(userMessage, baseConfig);

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.reasoning_effort).toBeUndefined();
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockOpenAiClient(undefined);
    client.chat.completions.create.mockRejectedValue(new Error("Network error"));

    const adapter = createOpenAiAdapter(client as never);

    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(AiEngineError);
    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(
      "OpenAI API call failed",
    );
  });
});
