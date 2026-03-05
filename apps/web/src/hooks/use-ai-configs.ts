import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AiConfig, CreateAiConfig, UpdateAiConfig } from "@/types/ai-config";

const KEYS = {
  all: ["ai-configs"] as const,
  detail: (id: string) => ["ai-configs", id] as const,
};

export function useAiConfigs() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<AiConfig[]>("/ai/configs"),
  });
}

export function useAiConfig(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<AiConfig>(`/ai/configs/${id}`),
  });
}

export function useCreateAiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAiConfig) => api.post<AiConfig>("/ai/configs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateAiConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAiConfig) => api.patch<AiConfig>(`/ai/configs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteAiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai/configs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
