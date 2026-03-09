import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TenantMember } from "@/types/tenant";

const KEYS = {
  all: ["tenant-members"] as const,
};

export function useTenantMembers() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<{ members: TenantMember[] }>("/tenants/members"),
    select: (data) => data.members,
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch(`/tenants/members/${memberId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.delete(`/tenants/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
