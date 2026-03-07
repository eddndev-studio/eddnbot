import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { MessageTemplate, CreateTemplateRequest } from "@/types/whatsapp-template";

const KEYS = {
  all: (accountId: string) => ["whatsapp-templates", accountId] as const,
};

export function useWhatsAppTemplates(accountId: string) {
  return useQuery({
    queryKey: KEYS.all(accountId),
    queryFn: () =>
      api.get<MessageTemplate[]>(`/whatsapp/accounts/${accountId}/templates`),
  });
}

export function useCreateWhatsAppTemplate(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      api.post<{ id: string; status: string; category: string }>(
        `/whatsapp/accounts/${accountId}/templates`,
        data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(accountId) }),
  });
}

export function useDeleteWhatsAppTemplate(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateName: string) =>
      api.delete(`/whatsapp/accounts/${accountId}/templates/${templateName}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all(accountId) }),
  });
}
