import { describe, it, expect } from "vitest";
import { createAiEngine } from "../engine";
import { AiProviderNotFoundError } from "../errors";

describe("createAiEngine", () => {
  it("returns an adapter for openai", () => {
    const engine = createAiEngine({ provider: "openai" });
    expect(engine).toBeDefined();
    expect(engine.chat).toBeTypeOf("function");
    expect(engine.chatStream).toBeTypeOf("function");
  });

  it("returns an adapter for anthropic", () => {
    const engine = createAiEngine({ provider: "anthropic" });
    expect(engine).toBeDefined();
    expect(engine.chat).toBeTypeOf("function");
    expect(engine.chatStream).toBeTypeOf("function");
  });

  it("returns an adapter for gemini", () => {
    const engine = createAiEngine({ provider: "gemini" });
    expect(engine).toBeDefined();
    expect(engine.chat).toBeTypeOf("function");
    expect(engine.chatStream).toBeTypeOf("function");
  });

  it("throws AiProviderNotFoundError for unknown provider", () => {
    expect(() => createAiEngine({ provider: "unknown" as never })).toThrow(
      AiProviderNotFoundError,
    );
  });
});
