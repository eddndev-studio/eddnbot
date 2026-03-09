import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TenantInvitation, PendingInvitation, AcceptInvitationResponse } from "@/types/tenant";

const KEYS = {
  all: ["tenant-invitations"] as const,
  pending: ["tenant-invitations-pending"] as const,
};

export function useTenantInvitations() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<{ invitations: TenantInvitation[] }>("/tenants/invitations"),
    select: (data) => data.invitations,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role?: string }) =>
      api.post<TenantInvitation>("/tenants/invitations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/tenants/invitations/${invitationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: KEYS.pending,
    queryFn: () => api.get<{ invitations: PendingInvitation[] }>("/tenants/invitations/pending"),
    select: (data) => data.invitations,
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api.post<AcceptInvitationResponse>("/tenants/invitations/accept", { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.pending }),
  });
}
