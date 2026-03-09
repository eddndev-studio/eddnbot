export interface TenantMember {
  id: string;
  accountId: string;
  role: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface TenantInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
}

export interface PendingInvitation {
  id: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  inviterName: string;
  expiresAt: string;
}

export interface AcceptInvitationResponse {
  tenantId: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
}
