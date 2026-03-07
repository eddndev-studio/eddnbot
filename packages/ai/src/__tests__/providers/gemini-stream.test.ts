import { describe, it, expect, vi } from "vitest";
import { createGeminiAdapter } from "../../providers/gemini";
import type { AiEngineConfig, ChatMessage, AiStreamChunk } from "../../types";
import { AiEngineError } from "../../errors";

async function* fakeStream(chunks: unknown[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function mockGeminiStreamClient(chunks: unknown[]) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue(chunks[0] ?? { text: "" }),
      generateContentStream: vi.fn().mockReturnValue(fakeStream(chunks)),
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

async function collectChunks(gen: AsyncGenerator<AiStreamChunk>): Promise<AiStreamChunk[]> {
  const chunks: AiStreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("Gemini adapter streaming", () => {
  it("streams text chunks", async () => {
    const client = mockGeminiStreamClient([
      { text: "Hello" },
      { text: " world" },
      {
        text: "",
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      },
    ]);

    const adapter = createGeminiAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const textChunks = chunks.filter((c) => c.type === "text");
    expect(textChunks).toEqual([
      { type: "text", content: "Hello" },
      { type: "text", content: " world" },
    ]);
  });

  it("emits usage metadata", async () => {
    const client = mockGeminiStreamClient([
      { text: "Hi" },
      {
        usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 3 },
      },
    ]);

    const adapter = createGeminiAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    expect(chunks).toContainEqual({
      type: "usage",
      usage: {
        inputTokens: 15,
        outputTokens: 3,
        cachedInputTokens: undefined,
      },
    });
  });

  it("emits done event at the end", async () => {
    const client = mockGeminiStreamClient([{ text: "Hi" }]);

    const adapter = createGeminiAdapter(client as never);
    const chunks = await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.type).toBe("done");
  });

  it("passes correct params to generateContentStream", async () => {
    const client = mockGeminiStreamClient([{ text: "OK" }]);

    const adapter = createGeminiAdapter(client as never);
    await collectChunks(adapter.chatStream(userMessage, baseConfig));

    const call = client.models.generateContentStream.mock.calls[0][0];
    expect(call.model).toBe("gemini-2.5-flash");
    expect(call.config.temperature).toBe(0.7);
    expect(call.config.maxOutputTokens).toBe(1000);
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockGeminiStreamClient([]);
    client.models.generateContentStream.mockImplementation(() => {
      throw new Error("API error");
    });

    const adapter = createGeminiAdapter(client as never);

    await expect(collectChunks(adapter.chatStream(userMessage, baseConfig))).rejects.toThrow(
      AiEngineError,
    );
  });
});
