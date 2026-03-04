import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyWebhookSignature,
  verifyChallenge,
  parseWebhookPayload,
} from "../webhook";
import type { WebhookPayload } from "../types";
import { WebhookVerificationError } from "../errors";

const APP_SECRET = "test-app-secret";

function sign(body: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hmac}`;
}

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"test":"data"}';
    const signature = sign(body, APP_SECRET);
    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = '{"test":"data"}';
    const signature = "sha256=invalid";
    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const body = '{"test":"data"}';
    const signature = sign(body, APP_SECRET);
    expect(verifyWebhookSignature('{"test":"tampered"}', signature, APP_SECRET)).toBe(false);
  });

  it("returns false for missing signature prefix", () => {
    const body = '{"test":"data"}';
    expect(verifyWebhookSignature(body, "nope", APP_SECRET)).toBe(false);
  });
});

describe("verifyChallenge", () => {
  const VERIFY_TOKEN = "my-verify-token";

  it("returns the challenge when mode and token match", () => {
    const result = verifyChallenge("subscribe", VERIFY_TOKEN, "challenge-123", VERIFY_TOKEN);
    expect(result).toBe("challenge-123");
  });

  it("throws for wrong mode", () => {
    expect(() =>
      verifyChallenge("unsubscribe", VERIFY_TOKEN, "challenge-123", VERIFY_TOKEN),
    ).toThrow(WebhookVerificationError);
  });

  it("throws for wrong token", () => {
    expect(() =>
      verifyChallenge("subscribe", "wrong-token", "challenge-123", VERIFY_TOKEN),
    ).toThrow(WebhookVerificationError);
  });

  it("throws when challenge is missing", () => {
    expect(() =>
      verifyChallenge("subscribe", VERIFY_TOKEN, undefined as unknown as string, VERIFY_TOKEN),
    ).toThrow(WebhookVerificationError);
  });
});

describe("parseWebhookPayload", () => {
  it("extracts messages from a payload", () => {
    const payload: WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+1234567890",
                  phone_number_id: "phone-1",
                },
                contacts: [{ profile: { name: "John" }, wa_id: "5491155551234" }],
                messages: [
                  {
                    from: "5491155551234",
                    id: "wamid.abc123",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Hello!" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const events = parseWebhookPayload(payload);
    expect(events).toHaveLength(1);
    expect(events[0].phoneNumberId).toBe("phone-1");
    expect(events[0].displayPhoneNumber).toBe("+1234567890");
    expect(events[0].messages).toHaveLength(1);
    expect(events[0].messages[0].text?.body).toBe("Hello!");
    expect(events[0].contacts).toHaveLength(1);
    expect(events[0].contacts[0].profile.name).toBe("John");
  });

  it("extracts status updates from a payload", () => {
    const payload: WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+1234567890",
                  phone_number_id: "phone-1",
                },
                statuses: [
                  {
                    id: "wamid.abc123",
                    status: "delivered",
                    timestamp: "1700000001",
                    recipient_id: "5491155551234",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const events = parseWebhookPayload(payload);
    expect(events).toHaveLength(1);
    expect(events[0].statuses).toHaveLength(1);
    expect(events[0].statuses[0].status).toBe("delivered");
    expect(events[0].messages).toHaveLength(0);
  });

  it("handles multiple entries and changes", () => {
    const payload: WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "+1", phone_number_id: "p1" },
                messages: [{ from: "111", id: "m1", timestamp: "1", type: "text" }],
              },
            },
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "+2", phone_number_id: "p2" },
                messages: [{ from: "222", id: "m2", timestamp: "2", type: "text" }],
              },
            },
          ],
        },
      ],
    };

    const events = parseWebhookPayload(payload);
    expect(events).toHaveLength(2);
    expect(events[0].phoneNumberId).toBe("p1");
    expect(events[1].phoneNumberId).toBe("p2");
  });

  it("returns empty array for empty entries", () => {
    const payload: WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [],
    };
    expect(parseWebhookPayload(payload)).toHaveLength(0);
  });
});
