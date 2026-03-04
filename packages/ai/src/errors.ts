export class AiEngineError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiEngineError";
  }
}

export class AiProviderNotFoundError extends AiEngineError {
  constructor(provider: string) {
    super(`Unknown AI provider: ${provider}`, provider);
    this.name = "AiProviderNotFoundError";
  }
}
