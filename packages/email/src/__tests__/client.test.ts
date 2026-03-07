import { describe, it, expect, vi } from "vitest";
import { createEmailClient } from "../client";

// Mock @aws-sdk/client-ses
const mockSend = vi.fn().mockResolvedValue({ MessageId: "mock-msg-id-123" });

vi.mock("@aws-sdk/client-ses", () => {
  return {
    SESClient: class {
      send = mockSend;
    },
    SendEmailCommand: class {
      constructor(public input: unknown) {}
    },
  };
});

describe("createEmailClient", () => {
  const config = {
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    fromAddress: "noreply@eddnbot.com",
  };

  it("sends an email and returns messageId", async () => {
    const client = createEmailClient(config);

    const result = await client.send({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.messageId).toBe("mock-msg-id-123");
  });

  it("sends without text body", async () => {
    const client = createEmailClient(config);

    const result = await client.send({
      to: "user@example.com",
      subject: "HTML Only",
      html: "<p>HTML content</p>",
    });

    expect(result.messageId).toBe("mock-msg-id-123");
  });
});
