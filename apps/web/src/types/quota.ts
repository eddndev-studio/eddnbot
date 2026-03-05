export interface Quota {
  id: string;
  tenantId: string;
  maxAiTokensPerMonth: number | null;
  maxWhatsappMessagesPerMonth: number | null;
  maxApiRequestsPerMonth: number | null;
  maxRequestsPerMinute: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertQuota {
  maxAiTokensPerMonth?: number | null;
  maxWhatsappMessagesPerMonth?: number | null;
  maxApiRequestsPerMonth?: number | null;
  maxRequestsPerMinute?: number;
}
