export interface TranscriptionConfig {
  apiKey: string;
  model: string;
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: "json" | "text" | "srt" | "vtt" | "verbose_json";
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResponse {
  text: string;
  duration?: number;
  language?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionAdapter {
  transcribe(
    file: Buffer,
    fileName: string,
    config: TranscriptionConfig,
  ): Promise<TranscriptionResponse>;
}
