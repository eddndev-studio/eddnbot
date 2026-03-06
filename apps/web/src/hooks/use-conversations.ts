import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ConversationListItem,
  ConversationDetail,
  Message,
  PaginatedResponse,
  ConversationStats,
} from "@/types/conversation";

export interface ConversationListParams {
  accountId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const KEYS = {
  all: ["conversations"] as const,
  list: (params: ConversationListParams) => ["conversations", "list", params] as const,
  detail: (id: string) => ["conversations", id] as const,
  messages: (id: string, page: number) => ["conversations", id, "messages", page] as const,
  stats: ["conversations", "stats"] as const,
};

export function useConversations(params: ConversationListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  const path = `/conversations${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => api.get<PaginatedResponse<ConversationListItem>>(path),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<ConversationDetail>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useConversationMessages(id: string, page: number = 1) {
  return useQuery({
    queryKey: KEYS.messages(id, page),
    queryFn: () => api.get<PaginatedResponse<Message>>(`/conversations/${id}/messages?page=${page}&limit=50`),
    enabled: !!id,
  });
}

export function useConversationStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: () => api.get<ConversationStats>("/conversations/stats"),
  });
}
