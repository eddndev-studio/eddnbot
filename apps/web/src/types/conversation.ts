export interface ConversationListItem {
  id: string;
  whatsappAccountId: string;
  contactPhone: string;
  contactName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  account: {
    displayPhoneNumber: string | null;
    phoneNumberId: string;
  };
  messageCount: number;
  unreadCount: number;
  lastMessage: {
    content: Record<string, unknown>;
    direction: string;
    type: string;
    createdAt: string;
  } | null;
}

export interface ConversationDetail {
  id: string;
  whatsappAccountId: string;
  contactPhone: string;
  contactName: string | null;
  status: string;
  windowExpiresAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  account: {
    displayPhoneNumber: string | null;
    phoneNumberId: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  waMessageId: string | null;
  direction: string;
  type: string;
  content: Record<string, unknown>;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConversationStats {
  total: number;
  active: number;
  unread: number;
}
