export interface WhatsAppAccount {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string | null;
  accessToken: string;
  webhookVerifyToken: string | null;
  aiConfigId: string | null;
  autoReplyEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsAppAccount {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  displayPhoneNumber?: string;
  webhookVerifyToken?: string;
  aiConfigId?: string | null;
  autoReplyEnabled?: boolean;
}

export interface UpdateWhatsAppAccount {
  displayPhoneNumber?: string | null;
  accessToken?: string;
  webhookVerifyToken?: string | null;
  isActive?: boolean;
  aiConfigId?: string | null;
  autoReplyEnabled?: boolean;
}
