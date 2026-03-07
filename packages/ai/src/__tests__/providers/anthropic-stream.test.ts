import { describe, it, expect, vi } from "vitest";
import { createAnthropicAdapter } from "../../providers/anthropic";
import type { AiEngineConfig, ChatMessage, AiStreamChunk } from "../../types";
import { AiEngineError } from "../../errors";

async function* fakeStream(events: unknown[]) {
  for (const event of events) {
    yield event;
  }
}

function mockAnthropicStreamClient(events: unknown[]) {
  return {
    messages: {
      create: vi.fn(),
      stream: vi.fn().mockReturnValue(fakeStream(events)),
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

async function collectChunks(gen: AsyncGenerator<AiStreamChunk>): Promise<AiStreamChunk[]> {
  const chunks: AiStreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("Anthropic adapter streaming", () => {
  it("streams text deltas", async () => {
    const client = mockAnthropicStreamClient([
      {
        type: "message_start",
        message: { usage: { input_tokens: 10 } },
      },
      {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Hello" },
      },
      {
        type: "content_block_delta",
        delta: { type: "text_delta", text: " world" },
      },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 5 },
      },
    ]);

    const adapter = createAnthropicAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const textChunks = chunks.filter((c) => c.type === "text");
    expect(textChunks).toEqual([
      { type: "text", content: "Hello" },
      { type: "text", content: " world" },
    ]);
  });

  it("emits thinking deltas", async () => {
    const client = mockAnthropicStreamClient([
      {
        type: "message_start",
        message: { usage: { input_tokens: 10 } },
      },
      {
        type: "content_block_delta",
        delta: { type: "thinking_delta", thinking: "Let me think..." },
      },
      {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Answer" },
      },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 20 },
      },
    ]);

    const adapter = createAnthropicAdapter(client as never);
    const chunks = await collectChunks(
      adapter.chatStream(userMessage, {
        ...baseConfig,
        thinking: { provider: "anthropic", config: { budgetTokens: 5000 } },
      }),
    );

    expect(chunks).toContainEqual({ type: "thinking", content: "Let me think..." });
    expect(chunks).toContainEqual({ type: "text", content: "Answer" });
  });

  it("emits usage from message_start and message_delta", async () => {
    const client = mockAnthropicStreamClient([
      {
        type: "message_start",
        message: { usage: { input_tokens: 15 } },
      },
      {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Hi" },
      },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 3 },
      },
    ]);

    const adapter = createAnthropicAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const usageChunks = chunks.filter((c) => c.type === "usage");
    expect(usageChunks).toContainEqual({
      type: "usage",
      usage: { inputTokens: 15, cachedInputTokens: undefined },
    });
    expect(usageChunks).toContainEqual({
      type: "usage",
      usage: { outputTokens: 3 },
    });
  });

  it("emits done with stop_reason", async () => {
    const client = mockAnthropicStreamClient([
      {
        type: "message_start",
        message: { usage: { input_tokens: 10 } },
      },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 5 },
      },
    ]);

    const adapter = createAnthropicAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    expect(chunks).toContainEqual({ type: "done", finishReason: "end_turn" });
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockAnthropicStreamClient([]);
    client.messages.stream.mockImplementation(() => {
      throw new Error("API error");
    });

    const adapter = createAnthropicAdapter(client as never);

    await expect(collectChunks(adapter.chatStream(userMessage, baseConfig))).rejects.toThrow(
      AiEngineError,
    );
  });
});
