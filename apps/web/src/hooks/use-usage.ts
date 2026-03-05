import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UsageResponse } from "@/types/usage";

export function useUsage(month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery({
    queryKey: ["usage", month ?? "current"],
    queryFn: () => api.get<UsageResponse>(`/usage${params}`),
  });
}
