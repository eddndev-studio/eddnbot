// ── Client Config ──

export interface WhatsAppClientConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string; // default "v21.0"
}

// ── Adapter ──

export interface WhatsAppAdapter {
  sendMessage(message: OutboundMessage): Promise<SendMessageResponse>;
  markAsRead(messageId: string): Promise<void>;
}

// ── Outbound Messages ──

export type OutboundMessage =
  | TextMessage
  | ImageMessage
  | DocumentMessage
  | AudioMessage
  | VideoMessage
  | LocationMessage
  | ReactionMessage
  | InteractiveMessage
  | TemplateMessage;

export interface TextMessage {
  type: "text";
  to: string;
  text: { body: string; preview_url?: boolean };
}

export interface ImageMessage {
  type: "image";
  to: string;
  image: { link?: string; id?: string; caption?: string };
}

export interface DocumentMessage {
  type: "document";
  to: string;
  document: { link?: string; id?: string; caption?: string; filename?: string };
}

export interface AudioMessage {
  type: "audio";
  to: string;
  audio: { link?: string; id?: string };
}

export interface VideoMessage {
  type: "video";
  to: string;
  video: { link?: string; id?: string; caption?: string };
}

export interface LocationMessage {
  type: "location";
  to: string;
  location: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface ReactionMessage {
  type: "reaction";
  to: string;
  reaction: { message_id: string; emoji: string };
}

export interface InteractiveMessage {
  type: "interactive";
  to: string;
  interactive: Record<string, unknown>;
}

export interface TemplateMessage {
  type: "template";
  to: string;
  template: { name: string; language: { code: string }; components?: unknown[] };
}

// ── Send Response ──

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// ── Webhook Types ──

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookChangeValue;
  field: string;
}

export interface WebhookChangeValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
  errors?: WebhookError[];
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  reaction?: { message_id: string; emoji: string };
  interactive?: { type: string; [key: string]: unknown };
  button?: { text: string; payload: string };
  sticker?: { id: string; mime_type: string; sha256: string };
}

export interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  href?: string;
}

// ── Parsed webhook event (flattened) ──

export interface ParsedWebhookEvent {
  phoneNumberId: string;
  displayPhoneNumber: string;
  messages: WebhookMessage[];
  statuses: WebhookStatus[];
  errors: WebhookError[];
  contacts: Array<{ profile: { name: string }; wa_id: string }>;
}
