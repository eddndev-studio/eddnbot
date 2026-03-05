export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenant {
  name: string;
  slug: string;
}

export interface UpdateTenant {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKey {
  scopes?: string[];
  expiresAt?: string;
}

export interface ApiKeyWithRaw extends ApiKey {
  rawKey: string;
}

export interface AdminStats {
  tenants: number;
  whatsappAccounts: number;
  aiConfigs: number;
  apiKeys: number;
}

export interface TenantUsage {
  tenantId: string;
  name: string;
  slug: string;
  aiTokens: { total: number; byProvider: Record<string, number> };
  whatsappMessages: number;
  apiRequests: number;
  quotas: {
    maxAiTokensPerMonth: number | null;
    maxWhatsappMessagesPerMonth: number | null;
    maxApiRequestsPerMonth: number | null;
    maxRequestsPerMinute: number | null;
  } | null;
}

export interface GlobalUsage {
  month: string;
  totals: {
    aiTokens: number;
    whatsappMessages: number;
    apiRequests: number;
  };
  tenants: TenantUsage[];
}
