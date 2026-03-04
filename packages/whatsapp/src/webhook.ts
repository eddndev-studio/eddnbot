import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "./errors";
import type { WebhookPayload, ParsedWebhookEvent } from "./types";

export function verifyWebhookSignature(
  body: string,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(body).digest("hex");
  const received = signature.slice("sha256=".length);

  if (expected.length !== received.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function verifyChallenge(
  mode: string,
  verifyToken: string,
  challenge: string,
  expectedToken: string,
): string {
  if (mode !== "subscribe") {
    throw new WebhookVerificationError(`Invalid hub.mode: ${mode}`);
  }
  if (verifyToken !== expectedToken) {
    throw new WebhookVerificationError("Verify token mismatch");
  }
  if (!challenge) {
    throw new WebhookVerificationError("Missing hub.challenge");
  }
  return challenge;
}

export function parseWebhookPayload(payload: WebhookPayload): ParsedWebhookEvent[] {
  const events: ParsedWebhookEvent[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { value } = change;
      events.push({
        phoneNumberId: value.metadata.phone_number_id,
        displayPhoneNumber: value.metadata.display_phone_number,
        messages: value.messages ?? [],
        statuses: value.statuses ?? [],
        errors: value.errors ?? [],
        contacts: value.contacts ?? [],
      });
    }
  }

  return events;
}
