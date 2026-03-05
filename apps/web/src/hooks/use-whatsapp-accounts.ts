import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  WhatsAppAccount,
  CreateWhatsAppAccount,
  UpdateWhatsAppAccount,
} from "@/types/whatsapp-account";

const KEYS = {
  all: ["whatsapp-accounts"] as const,
  detail: (id: string) => ["whatsapp-accounts", id] as const,
};

export function useWhatsAppAccounts() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<WhatsAppAccount[]>("/whatsapp/accounts"),
  });
}

export function useWhatsAppAccount(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<WhatsAppAccount>(`/whatsapp/accounts/${id}`),
  });
}

export function useCreateWhatsAppAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWhatsAppAccount) =>
      api.post<WhatsAppAccount>("/whatsapp/accounts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateWhatsAppAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhatsAppAccount) =>
      api.patch<WhatsAppAccount>(`/whatsapp/accounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteWhatsAppAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
