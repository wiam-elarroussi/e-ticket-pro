import { apiFetch, EVENTS_API_URL } from '@/lib/api-client';
import { QuotaScope, SalesQuota } from '@/lib/quota-types';

export function fetchSalesQuotas(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : '';
  return apiFetch<SalesQuota[]>(`/sales-quotas${qs}`, { baseUrl: EVENTS_API_URL });
}

export interface SalesQuotaPayload {
  eventId: string;
  scope: QuotaScope;
  standId?: string;
  zoneId?: string;
  channelId?: string;
  categoryId?: string;
  maxQuantity?: number;
  isBlocked?: boolean;
}

export function createSalesQuota(payload: SalesQuotaPayload) {
  return apiFetch<SalesQuota>('/sales-quotas', { method: 'POST', json: payload, baseUrl: EVENTS_API_URL });
}

export function updateSalesQuota(id: string, maxQuantity: number | undefined) {
  return apiFetch<SalesQuota>(`/sales-quotas/${id}`, {
    method: 'PATCH',
    json: { maxQuantity },
    baseUrl: EVENTS_API_URL,
  });
}

export function setSalesQuotaStatus(id: string, isBlocked: boolean) {
  return apiFetch<SalesQuota>(`/sales-quotas/${id}/status`, {
    method: 'PATCH',
    json: { isBlocked },
    baseUrl: EVENTS_API_URL,
  });
}

export function deleteSalesQuota(id: string) {
  return apiFetch<{ success: boolean }>(`/sales-quotas/${id}`, { method: 'DELETE', baseUrl: EVENTS_API_URL });
}
