// ── Template Types ──

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: Array<{ type: string; text: string; [key: string]: unknown }>;
}

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: TemplateComponent[];
}

export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: TemplateCategory;
  components: TemplateComponent[];
}

export interface CreateTemplateResponse {
  id: string;
  status: TemplateStatus;
  category: TemplateCategory;
}

export interface TemplateListFilters {
  name?: string;
  status?: TemplateStatus;
  category?: TemplateCategory;
}

export interface TemplateClientConfig {
  wabaId: string;
  accessToken: string;
  apiVersion?: string;
}

export interface TemplateAdapter {
  listTemplates(filters?: TemplateListFilters): Promise<MessageTemplate[]>;
  createTemplate(req: CreateTemplateRequest): Promise<CreateTemplateResponse>;
  deleteTemplate(name: string): Promise<void>;
}
