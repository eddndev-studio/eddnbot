import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-client";
import type { AiConfig } from "@/types/ai-config";
import type { WhatsAppAccount } from "@/types/whatsapp-account";
import type { Quota, UpsertQuota } from "@/types/quota";

export function useAdminTenantAiConfigs(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-ai-configs", tenantId],
    queryFn: () => adminApi.get<{ aiConfigs: AiConfig[] }>(`/admin/tenants/${tenantId}/ai-configs`),
    enabled: !!tenantId,
  });
}

export function useAdminTenantWhatsAppAccounts(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-wa", tenantId],
    queryFn: () =>
      adminApi.get<{ whatsappAccounts: WhatsAppAccount[] }>(
        `/admin/tenants/${tenantId}/whatsapp-accounts`,
      ),
    enabled: !!tenantId,
  });
}

export function useAdminTenantQuotas(tenantId: string) {
  return useQuery({
    queryKey: ["admin-tenant-quotas", tenantId],
    queryFn: () => adminApi.get<{ quotas: Quota | null }>(`/admin/tenants/${tenantId}/quotas`),
    enabled: !!tenantId,
  });
}

export function useAdminUpsertQuotas(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertQuota) =>
      adminApi.put<Quota>(`/admin/tenants/${tenantId}/quotas`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-tenant-quotas", tenantId] }),
  });
}

export function useAdminTenantUsage(tenantId: string, month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery({
    queryKey: ["admin-tenant-usage", tenantId, month ?? "current"],
    queryFn: () =>
      adminApi.get<{
        month: string;
        tenantId: string;
        aiTokens: { total: number; byProvider: Record<string, number> };
        whatsappMessages: number;
        apiRequests: number;
      }>(`/admin/usage/${tenantId}${params}`),
    enabled: !!tenantId,
  });
}
