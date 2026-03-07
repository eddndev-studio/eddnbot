import { WhatsAppApiError } from "./errors";
import type {
  TemplateClientConfig,
  TemplateAdapter,
  TemplateListFilters,
  MessageTemplate,
  CreateTemplateRequest,
  CreateTemplateResponse,
} from "./template-types";

const DEFAULT_API_VERSION = "v21.0";

interface MetaPaginatedResponse {
  data: MessageTemplate[];
  paging?: { next?: string };
}

export function createTemplateClient(
  config: TemplateClientConfig,
  fetchFn: typeof fetch = globalThis.fetch,
): TemplateAdapter {
  const version = config.apiVersion ?? DEFAULT_API_VERSION;
  const baseUrl = `https://graph.facebook.com/${version}/${config.wabaId}/message_templates`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
  };

  async function handleError(response: Response): Promise<never> {
    const data = await response.json().catch(() => ({}));
    const err = (data as { error?: { message?: string; code?: number } }).error;
    throw new WhatsAppApiError(
      err?.message ?? "WhatsApp API error",
      response.status,
      err?.code,
    );
  }

  return {
    async listTemplates(filters?: TemplateListFilters): Promise<MessageTemplate[]> {
      const params = new URLSearchParams();
      if (filters?.name) params.set("name", filters.name);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.category) params.set("category", filters.category);

      const templates: MessageTemplate[] = [];
      let url: string | null = params.size
        ? `${baseUrl}?${params.toString()}`
        : baseUrl;

      while (url) {
        const response = await fetchFn(url, { method: "GET", headers });

        if (!response.ok) await handleError(response);

        const data = (await response.json()) as MetaPaginatedResponse;
        templates.push(...data.data);
        url = data.paging?.next ?? null;
      }

      return templates;
    },

    async createTemplate(req: CreateTemplateRequest): Promise<CreateTemplateResponse> {
      const response = await fetchFn(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });

      if (!response.ok) await handleError(response);

      return (await response.json()) as CreateTemplateResponse;
    },

    async deleteTemplate(name: string): Promise<void> {
      const url = `${baseUrl}?name=${encodeURIComponent(name)}`;
      const response = await fetchFn(url, { method: "DELETE", headers });

      if (!response.ok) await handleError(response);
    },
  };
}
