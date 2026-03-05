import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-client";
import type { AdminStats, GlobalUsage } from "@/types/admin";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.get<AdminStats>("/admin/overview/stats"),
  });
}

export function useAdminGlobalUsage(month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery({
    queryKey: ["admin-usage", month ?? "current"],
    queryFn: () => adminApi.get<GlobalUsage>(`/admin/usage${params}`),
  });
}
