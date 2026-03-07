import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ModelDefinition } from "@/types/ai-config";

export function useAiModels(provider?: string) {
  return useQuery({
    queryKey: ["ai-models", provider],
    queryFn: () =>
      api.get<ModelDefinition[]>(`/ai/models${provider ? `?provider=${provider}` : ""}`),
  });
}
