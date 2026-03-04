import { describe, it, expect, vi } from "vitest";
import { createWhatsAppClient } from "../client";
import { WhatsAppApiError } from "../errors";
import type { WhatsAppClientConfig, TextMessage, TemplateMessage } from "../types";

const config: WhatsAppClientConfig = {
  phoneNumberId: "123456789",
  accessToken: "test-access-token",
};

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("createWhatsAppClient", () => {
  it("uses default api version v21.0", async () => {
    const fetchFn = mockFetch(200, {
      messaging_product: "whatsapp",
      contacts: [{ input: "5491155551234", wa_id: "5491155551234" }],
      messages: [{ id: "wamid.abc" }],
    });

    const client = createWhatsAppClient(config, fetchFn);
    const msg: TextMessage = { type: "text", to: "5491155551234", text: { body: "Hi" } };
    await client.sendMessage(msg);

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/123456789/messages",
      expect.any(Object),
    );
  });

  it("uses custom api version", async () => {
    const fetchFn = mockFetch(200, {
      messaging_product: "whatsapp",
      contacts: [],
      messages: [{ id: "wamid.abc" }],
    });

    const client = createWhatsAppClient({ ...config, apiVersion: "v22.0" }, fetchFn);
    const msg: TextMessage = { type: "text", to: "123", text: { body: "Hi" } };
    await client.sendMessage(msg);

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v22.0/123456789/messages",
      expect.any(Object),
    );
  });
});

describe("sendMessage", () => {
  it("sends a text message", async () => {
    const responseBody = {
      messaging_product: "whatsapp",
      contacts: [{ input: "5491155551234", wa_id: "5491155551234" }],
      messages: [{ id: "wamid.text123" }],
    };
    const fetchFn = mockFetch(200, responseBody);
    const client = createWhatsAppClient(config, fetchFn);

    const msg: TextMessage = { type: "text", to: "5491155551234", text: { body: "Hello!" } };
    const result = await client.sendMessage(msg);

    expect(result.messages[0].id).toBe("wamid.text123");
    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-access-token",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: "5491155551234",
          type: "text",
          text: { body: "Hello!" },
        }),
      }),
    );
  });

  it("sends a template message", async () => {
    const fetchFn = mockFetch(200, {
      messaging_product: "whatsapp",
      contacts: [{ input: "123", wa_id: "123" }],
      messages: [{ id: "wamid.tmpl" }],
    });
    const client = createWhatsAppClient(config, fetchFn);

    const msg: TemplateMessage = {
      type: "template",
      to: "123",
      template: { name: "hello_world", language: { code: "en_US" } },
    };
    const result = await client.sendMessage(msg);

    expect(result.messages[0].id).toBe("wamid.tmpl");
    const calledBody = JSON.parse((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(calledBody.type).toBe("template");
    expect(calledBody.template.name).toBe("hello_world");
  });

  it("throws WhatsAppApiError on non-ok response", async () => {
    const fetchFn = mockFetch(400, {
      error: { message: "Invalid parameter", type: "OAuthException", code: 100 },
    });
    const client = createWhatsAppClient(config, fetchFn);

    const msg: TextMessage = { type: "text", to: "123", text: { body: "fail" } };

    await expect(client.sendMessage(msg)).rejects.toThrow(WhatsAppApiError);
    await expect(client.sendMessage(msg)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 100,
    });
  });

  it("handles error response without error.code", async () => {
    const fetchFn = mockFetch(500, { error: { message: "Internal error" } });
    const client = createWhatsAppClient(config, fetchFn);

    const msg: TextMessage = { type: "text", to: "123", text: { body: "fail" } };

    await expect(client.sendMessage(msg)).rejects.toThrow(WhatsAppApiError);
    await expect(client.sendMessage(msg)).rejects.toMatchObject({
      statusCode: 500,
      errorCode: undefined,
    });
  });
});

describe("getMediaUrl", () => {
  it("returns media URL for valid media ID", async () => {
    const mediaResponse = {
      url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/...",
      mime_type: "audio/ogg",
      sha256: "abc123",
      file_size: 12345,
      id: "media-id-123",
    };
    const fetchFn = mockFetch(200, mediaResponse);
    const client = createWhatsAppClient(config, fetchFn);

    const result = await client.getMediaUrl("media-id-123");

    expect(result.url).toBe(mediaResponse.url);
    expect(result.mime_type).toBe("audio/ogg");
    expect(result.id).toBe("media-id-123");
  });

  it("throws WhatsAppApiError on failure", async () => {
    const fetchFn = mockFetch(404, {
      error: { message: "Media not found", code: 100 },
    });
    const client = createWhatsAppClient(config, fetchFn);

    await expect(client.getMediaUrl("bad-id")).rejects.toThrow(WhatsAppApiError);
  });

  it("uses correct Graph API URL with version", async () => {
    const fetchFn = mockFetch(200, {
      url: "https://example.com",
      mime_type: "audio/ogg",
      sha256: "abc",
      file_size: 100,
      id: "mid-1",
    });
    const client = createWhatsAppClient({ ...config, apiVersion: "v22.0" }, fetchFn);

    await client.getMediaUrl("mid-1");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://graph.facebook.com/v22.0/mid-1",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("downloadMedia", () => {
  it("downloads binary and returns Buffer + mimeType", async () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => binaryData.buffer,
      headers: new Map([["content-type", "audio/ogg; codecs=opus"]]),
    });
    // Mock headers.get
    (fetchFn as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => binaryData.buffer,
      headers: { get: (name: string) => name === "content-type" ? "audio/ogg; codecs=opus" : null },
    });
    const client = createWhatsAppClient(config, fetchFn);

    const result = await client.downloadMedia("https://lookaside.fbsbx.com/media");

    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer).toHaveLength(4);
    expect(result.mimeType).toBe("audio/ogg; codecs=opus");
  });

  it("throws WhatsAppApiError on failure", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });
    const client = createWhatsAppClient(config, fetchFn);

    await expect(
      client.downloadMedia("https://example.com/media"),
    ).rejects.toThrow(WhatsAppApiError);
  });

  it("sends Authorization header", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: { get: () => "application/octet-stream" },
    });
    const client = createWhatsAppClient(config, fetchFn);

    await client.downloadMedia("https://lookaside.fbsbx.com/media");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://lookaside.fbsbx.com/media",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-access-token" },
      }),
    );
  });
});

describe("markAsRead", () => {
  it("sends read status for a message", async () => {
    const fetchFn = mockFetch(200, { success: true });
    const client = createWhatsAppClient(config, fetchFn);

    await client.markAsRead("wamid.abc123");

    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: "wamid.abc123",
        }),
      }),
    );
  });

  it("throws WhatsAppApiError when markAsRead fails", async () => {
    const fetchFn = mockFetch(401, {
      error: { message: "Unauthorized", code: 190 },
    });
    const client = createWhatsAppClient(config, fetchFn);

    await expect(client.markAsRead("wamid.fail")).rejects.toThrow(WhatsAppApiError);
  });
});
