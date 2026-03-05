export interface UsageResponse {
  month: string;
  aiTokens: {
    total: number;
    byProvider: Record<string, number>;
  };
  whatsappMessages: number;
  apiRequests: number;
  quotas: {
    maxAiTokensPerMonth: number | null;
    maxWhatsappMessagesPerMonth: number | null;
    maxApiRequestsPerMonth: number | null;
    maxRequestsPerMinute: number | null;
  } | null;
}
