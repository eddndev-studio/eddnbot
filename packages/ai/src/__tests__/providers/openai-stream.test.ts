import { describe, it, expect, vi } from "vitest";
import { createOpenAiAdapter } from "../../providers/openai";
import type { AiEngineConfig, ChatMessage, AiStreamChunk } from "../../types";
import { AiEngineError } from "../../errors";

async function* fakeStream(chunks: unknown[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function mockOpenAiStreamClient(chunks: unknown[]) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation((params: { stream?: boolean }) => {
          if (params.stream) return fakeStream(chunks);
          return Promise.resolve(chunks[0]);
        }),
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

async function collectChunks(gen: AsyncGenerator<AiStreamChunk>): Promise<AiStreamChunk[]> {
  const chunks: AiStreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("OpenAI adapter streaming", () => {
  it("streams text deltas", async () => {
    const client = mockOpenAiStreamClient([
      { choices: [{ delta: { content: "Hello" }, finish_reason: null }] },
      { choices: [{ delta: { content: " world" }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      { choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    ]);

    const adapter = createOpenAiAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const textChunks = chunks.filter((c) => c.type === "text");
    expect(textChunks).toEqual([
      { type: "text", content: "Hello" },
      { type: "text", content: " world" },
    ]);
  });

  it("emits usage and done events", async () => {
    const client = mockOpenAiStreamClient([
      { choices: [{ delta: { content: "Hi" }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      { choices: [], usage: { prompt_tokens: 15, completion_tokens: 3 } },
    ]);

    const adapter = createOpenAiAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    expect(chunks).toContainEqual({ type: "done", finishReason: "stop" });
    expect(chunks).toContainEqual({
      type: "usage",
      usage: {
        inputTokens: 15,
        outputTokens: 3,
        cachedInputTokens: undefined,
      },
    });
  });

  it("passes stream and stream_options in request", async () => {
    const client = mockOpenAiStreamClient([
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ]);

    const adapter = createOpenAiAdapter(client as never);
    await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.stream).toBe(true);
    expect(call.stream_options).toEqual({ include_usage: true });
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockOpenAiStreamClient([]);
    client.chat.completions.create.mockRejectedValue(new Error("Network error"));

    const adapter = createOpenAiAdapter(client as never);

    await expect(collectChunks(adapter.chatStream(userMessage, baseConfig))).rejects.toThrow(
      AiEngineError,
    );
  });
});
