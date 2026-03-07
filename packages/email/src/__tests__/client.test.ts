import { describe, it, expect, vi } from "vitest";
import { createEmailClient } from "../client";

const mockSend = vi.fn().mockResolvedValue({
  data: { id: "mock-msg-id-123" },
  error: null,
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

describe("createEmailClient", () => {
  const config = {
    apiKey: "re_test_fake_key",
    fromAddress: "noreply@eddn.dev",
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
    expect(mockSend).toHaveBeenCalledWith({
      from: "noreply@eddn.dev",
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });
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

  it("throws on Resend error", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API key" },
    });

    const client = createEmailClient(config);

    await expect(
      client.send({
        to: "user@example.com",
        subject: "Fail",
        html: "<p>fail</p>",
      }),
    ).rejects.toThrow("Resend error: Invalid API key");
  });
});
