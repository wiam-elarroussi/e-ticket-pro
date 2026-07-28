import { apiFetch } from '@/lib/api-client';
import { PartnerQuota } from '@/lib/types';

export function fetchPartnerQuotas(partnerId?: string) {
  const qs = partnerId ? `?partnerId=${partnerId}` : '';
  return apiFetch<PartnerQuota[]>(`/partner-quotas${qs}`);
}

export interface CreatePartnerQuotaPayload {
  partnerId: string;
  salesChannelId?: string;
  eventId?: string;
  ticketCategoryId?: string;
  maxQuantity: number;
  periodStart?: string;
  periodEnd?: string;
}

export function createPartnerQuota(payload: CreatePartnerQuotaPayload) {
  return apiFetch<PartnerQuota>('/partner-quotas', { method: 'POST', json: payload });
}

export type UpdatePartnerQuotaPayload = Partial<
  Pick<CreatePartnerQuotaPayload, 'maxQuantity' | 'periodStart' | 'periodEnd'>
>;

export function updatePartnerQuota(id: string, payload: UpdatePartnerQuotaPayload) {
  return apiFetch<PartnerQuota>(`/partner-quotas/${id}`, { method: 'PATCH', json: payload });
}

export function deletePartnerQuota(id: string) {
  return apiFetch<{ success: boolean }>(`/partner-quotas/${id}`, { method: 'DELETE' });
}
