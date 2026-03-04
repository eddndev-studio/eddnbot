import { describe, it, expect, vi } from "vitest";
import { createWhisperAdapter } from "../../providers/whisper";
import type { TranscriptionConfig } from "../../transcription-types";
import { AiEngineError } from "../../errors";

function mockOpenAiClient(response: unknown) {
  return {
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue(response),
      },
    },
  };
}

const baseConfig: TranscriptionConfig = {
  apiKey: "sk-test",
  model: "whisper-1",
};

const fakeAudio = Buffer.from("fake-audio-data");

describe("Whisper adapter", () => {
  it("transcribes audio and returns text", async () => {
    const client = mockOpenAiClient({ text: "Hello world" });

    const adapter = createWhisperAdapter(client as never);
    const result = await adapter.transcribe(fakeAudio, "audio.mp3", baseConfig);

    expect(result.text).toBe("Hello world");
  });

  it("passes model, language, prompt, and temperature", async () => {
    const client = mockOpenAiClient({ text: "Hola mundo" });

    const adapter = createWhisperAdapter(client as never);
    await adapter.transcribe(fakeAudio, "audio.mp3", {
      ...baseConfig,
      language: "es",
      prompt: "Transcribe Spanish",
      temperature: 0.3,
    });

    const call = client.audio.transcriptions.create.mock.calls[0][0];
    expect(call.model).toBe("whisper-1");
    expect(call.language).toBe("es");
    expect(call.prompt).toBe("Transcribe Spanish");
    expect(call.temperature).toBe(0.3);
  });

  it("passes response_format and returns verbose fields", async () => {
    const client = mockOpenAiClient({
      text: "Hello",
      duration: 3.5,
      language: "en",
      segments: [{ id: 0, start: 0, end: 3.5, text: "Hello" }],
    });

    const adapter = createWhisperAdapter(client as never);
    const result = await adapter.transcribe(fakeAudio, "audio.wav", {
      ...baseConfig,
      responseFormat: "verbose_json",
    });

    const call = client.audio.transcriptions.create.mock.calls[0][0];
    expect(call.response_format).toBe("verbose_json");
    expect(result.duration).toBe(3.5);
    expect(result.language).toBe("en");
    expect(result.segments).toEqual([{ id: 0, start: 0, end: 3.5, text: "Hello" }]);
  });

  it("sends file as File object with correct name", async () => {
    const client = mockOpenAiClient({ text: "OK" });

    const adapter = createWhisperAdapter(client as never);
    await adapter.transcribe(fakeAudio, "recording.ogg", baseConfig);

    const call = client.audio.transcriptions.create.mock.calls[0][0];
    const file = call.file;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("recording.ogg");
  });

  it("wraps errors in AiEngineError", async () => {
    const client = mockOpenAiClient(undefined);
    client.audio.transcriptions.create.mockRejectedValue(new Error("Network error"));

    const adapter = createWhisperAdapter(client as never);

    await expect(adapter.transcribe(fakeAudio, "audio.mp3", baseConfig)).rejects.toThrow(
      AiEngineError,
    );
    await expect(adapter.transcribe(fakeAudio, "audio.mp3", baseConfig)).rejects.toThrow(
      "Whisper API call failed",
    );
  });
});
