export class WhatsAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export class WhatsAppApiError extends WhatsAppError {
  public readonly statusCode: number;
  public readonly errorCode: number | undefined;

  constructor(message: string, statusCode: number, errorCode?: number) {
    super(message);
    this.name = "WhatsAppApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class WebhookVerificationError extends WhatsAppError {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}
