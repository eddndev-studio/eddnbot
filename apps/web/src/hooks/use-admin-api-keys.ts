import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-client";
import type { ApiKey, ApiKeyWithRaw, CreateApiKey } from "@/types/admin";

const KEYS = {
  forTenant: (tenantId: string) => ["admin-api-keys", tenantId] as const,
};

export function useAdminApiKeys(tenantId: string) {
  return useQuery({
    queryKey: KEYS.forTenant(tenantId),
    queryFn: () => adminApi.get<{ apiKeys: ApiKey[] }>(`/admin/tenants/${tenantId}/api-keys`),
    enabled: !!tenantId,
  });
}

export function useCreateAdminApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CreateApiKey }) =>
      adminApi.post<ApiKeyWithRaw>(`/admin/tenants/${tenantId}/api-keys`, data),
    onSuccess: (_, { tenantId }) =>
      qc.invalidateQueries({ queryKey: KEYS.forTenant(tenantId) }),
  });
}

export function useRevokeAdminApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, keyId }: { tenantId: string; keyId: string }) =>
      adminApi.delete(`/admin/tenants/${tenantId}/api-keys/${keyId}`),
    onSuccess: (_, { tenantId }) =>
      qc.invalidateQueries({ queryKey: KEYS.forTenant(tenantId) }),
  });
}
