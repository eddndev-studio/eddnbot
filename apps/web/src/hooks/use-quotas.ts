import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Quota, UpsertQuota } from "@/types/quota";

const KEYS = {
  all: ["quotas"] as const,
};

export function useQuotas() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<{ quotas: Quota | null }>("/quotas"),
  });
}

export function useUpsertQuotas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertQuota) => api.put<Quota>("/quotas", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
