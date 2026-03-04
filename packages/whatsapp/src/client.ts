import { WhatsAppApiError } from "./errors";
import type {
  WhatsAppClientConfig,
  WhatsAppAdapter,
  OutboundMessage,
  SendMessageResponse,
  MediaUrlResponse,
  MediaDownloadResult,
} from "./types";

const DEFAULT_API_VERSION = "v21.0";

function buildPayload(message: OutboundMessage): Record<string, unknown> {
  const { type, to, ...rest } = message;
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type,
    ...rest,
  };
}

export function createWhatsAppClient(
  config: WhatsAppClientConfig,
  fetchFn: typeof fetch = globalThis.fetch,
): WhatsAppAdapter {
  const version = config.apiVersion ?? DEFAULT_API_VERSION;
  const baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
  };

  async function request<T>(body: Record<string, unknown>): Promise<T> {
    const response = await fetchFn(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = (data as { error?: { message?: string; code?: number } }).error;
      throw new WhatsAppApiError(
        err?.message ?? "WhatsApp API error",
        response.status,
        err?.code,
      );
    }

    return data as T;
  }

  return {
    async sendMessage(message: OutboundMessage): Promise<SendMessageResponse> {
      return request<SendMessageResponse>(buildPayload(message));
    },

    async markAsRead(messageId: string): Promise<void> {
      await request({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      });
    },

    async getMediaUrl(mediaId: string): Promise<MediaUrlResponse> {
      const url = `https://graph.facebook.com/${version}/${mediaId}`;
      const response = await fetchFn(url, { method: "GET", headers });

      const data = await response.json();

      if (!response.ok) {
        const err = (data as { error?: { message?: string; code?: number } }).error;
        throw new WhatsAppApiError(
          err?.message ?? "WhatsApp API error",
          response.status,
          err?.code,
        );
      }

      return data as MediaUrlResponse;
    },

    async downloadMedia(url: string): Promise<MediaDownloadResult> {
      const response = await fetchFn(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (!response.ok) {
        throw new WhatsAppApiError(
          "Failed to download media",
          response.status,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get("content-type") ?? "application/octet-stream";

      return { buffer, mimeType };
    },
  };
}
