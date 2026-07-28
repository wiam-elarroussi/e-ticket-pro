export type PermissionEffect = 'GRANT' | 'DENY';
export type SalesChannelType = 'LOCAL_POS' | 'REMOTE_POS' | 'WEB' | 'PARTNER_API';
export type PartnerStatus = 'ACTIVE' | 'SUSPENDED';

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export interface Role {
  id: string;
  code: string;
  label: string;
  isSystem: boolean;
  createdAt: string;
  rolePermissions?: { permission: Permission }[];
}

export interface UserPermissionOverride {
  permission: Permission;
  effect: PermissionEffect;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: Role;
  userPermissions?: UserPermissionOverride[];
  /** Présents uniquement sur la liste (GET /users), pas sur /users/me ou /users/:id. */
  isOnline?: boolean;
  lastSeenAt?: string | null;
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  deviceInfo: { userAgent?: string | null } | null;
  issuedAt: string;
  expiresAt: string;
  lastActivityAt: string;
  salesChannel: { id: string; name: string; type: SalesChannelType } | null;
  user?: { id: string; username: string; fullName: string; role: { code: string; label: string } };
}

export interface SalesChannel {
  id: string;
  partnerId: string | null;
  name: string;
  type: SalesChannelType;
  isActive: boolean;
  salesWindowStart: string | null;
  salesWindowEnd: string | null;
  createdAt: string;
}

export interface PartnerQuota {
  id: string;
  partnerId: string;
  salesChannelId: string | null;
  eventId: string | null;
  ticketCategoryId: string | null;
  maxQuantity: number;
  soldQuantity: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface Partner {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: PartnerStatus;
  createdAt: string;
  archivedAt: string | null;
  archivedBy?: { id: string; fullName: string } | null;
  salesChannels?: SalesChannel[];
  quotas?: PartnerQuota[];
}
