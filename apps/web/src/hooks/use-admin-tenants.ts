import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-client";
import type { Tenant, CreateTenant, UpdateTenant } from "@/types/admin";

const KEYS = {
  all: ["admin-tenants"] as const,
  detail: (id: string) => ["admin-tenants", id] as const,
};

export function useAdminTenants(search?: string, active?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (active) params.set("active", active);
  const qs = params.toString();

  return useQuery({
    queryKey: [...KEYS.all, search ?? "", active ?? ""],
    queryFn: () => adminApi.get<{ tenants: Tenant[] }>(`/admin/tenants${qs ? `?${qs}` : ""}`),
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => adminApi.get<Tenant>(`/admin/tenants/${id}`),
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenant) => adminApi.post<Tenant>("/admin/tenants", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenant }) =>
      adminApi.patch<Tenant>(`/admin/tenants/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/tenants/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
