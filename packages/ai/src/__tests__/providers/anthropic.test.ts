import { describe, it, expect, vi } from "vitest";
import { createAnthropicAdapter } from "../../providers/anthropic";
import type { AiEngineConfig, ChatMessage } from "../../types";
import { AiEngineError } from "../../errors";

function mockAnthropicClient(response: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(response),
    },
  };
}

const baseConfig: AiEngineConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  apiKey: "sk-test",
  temperature: 0.7,
  maxOutputTokens: 1000,
};

const userMessage: ChatMessage[] = [{ role: "user", content: "Hi" }];

describe("Anthropic adapter", () => {
  it("sends messages and returns content", async () => {
    const client = mockAnthropicClient({
      content: [{ type: "text", text: "Hello!" }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: "end_turn",
    });

    const adapter = createAnthropicAdapter(client as never);
    const result = await adapter.chat(userMessage, baseConfig);

    expect(result.content).toBe("Hello!");
    expect(result.usage?.inputTokens).toBe(10);
    expect(result.usage?.outputTokens).toBe(5);
    expect(result.finishReason).toBe("end_turn");
  });

  it("passes system prompt as system param", async () => {
    const client = mockAnthropicClient({
      content: [{ type: "text", text: "OK" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = createAnthropicAdapter(client as never);
    await adapter.chat(userMessage, { ...baseConfig, systemPrompt: "Be helpful" });

    const call = client.messages.create.mock.calls[0][0];
    expect(call.system).toBe("Be helpful");
  });

  it("passes thinking config with budget_tokens when enabled", async () => {
    const client = mockAnthropicClient({
      content: [
        { type: "thinking", thinking: "Let me think..." },
        { type: "text", text: "Answer" },
      ],
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    const adapter = createAnthropicAdapter(client as never);
    const result = await adapter.chat(userMessage, {
      ...baseConfig,
      thinking: { provider: "anthropic", config: { budgetTokens: 5000 } },
    });

    const call = client.messages.create.mock.calls[0][0];
    expect(call.thinking).toEqual({ type: "enabled", budget_tokens: 5000 });
    expect(result.thinkingContent).toBe("Let me think...");
  });

  it("forces temperature to 1.0 when thinking is enabled", async () => {
    const client = mockAnthropicClient({
      content: [{ type: "text", text: "OK" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = createAnthropicAdapter(client as never);
    await adapter.chat(userMessage, {
      ...baseConfig,
      temperature: 0.5,
      thinking: { provider: "anthropic", config: { budgetTokens: 5000 } },
    });

    const call = client.messages.create.mock.calls[0][0];
    expect(call.temperature).toBe(1.0);
  });

  it("uses configured temperature when thinking is disabled", async () => {
    const client = mockAnthropicClient({
      content: [{ type: "text", text: "OK" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = createAnthropicAdapter(client as never);
    await adapter.chat(userMessage, { ...baseConfig, temperature: 0.3 });

    const call = client.messages.create.mock.calls[0][0];
    expect(call.temperature).toBe(0.3);
  });

  it("filters out system role messages from messages array", async () => {
    const client = mockAnthropicClient({
      content: [{ type: "text", text: "OK" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = createAnthropicAdapter(client as never);
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "Hi" },
    ];
    await adapter.chat(messages, baseConfig);

    const call = client.messages.create.mock.calls[0][0];
    expect(call.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockAnthropicClient(undefined);
    client.messages.create.mockRejectedValue(new Error("API error"));

    const adapter = createAnthropicAdapter(client as never);

    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(AiEngineError);
    await expect(adapter.chat(userMessage, baseConfig)).rejects.toThrow(
      "Anthropic API call failed",
    );
  });
});
