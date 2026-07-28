import { apiFetch } from '@/lib/api-client';
import { SalesChannel, SalesChannelType } from '@/lib/types';

export function fetchSalesChannels(partnerId?: string) {
  const qs = partnerId ? `?partnerId=${partnerId}` : '';
  return apiFetch<SalesChannel[]>(`/sales-channels${qs}`);
}

export interface CreateSalesChannelPayload {
  partnerId?: string;
  name: string;
  type: SalesChannelType;
  salesWindowStart?: string;
  salesWindowEnd?: string;
}

export function createSalesChannel(payload: CreateSalesChannelPayload) {
  return apiFetch<SalesChannel>('/sales-channels', { method: 'POST', json: payload });
}

export type UpdateSalesChannelPayload = Partial<Omit<CreateSalesChannelPayload, 'partnerId'>> & {
  isActive?: boolean;
};

export function updateSalesChannel(id: string, payload: UpdateSalesChannelPayload) {
  return apiFetch<SalesChannel>(`/sales-channels/${id}`, { method: 'PATCH', json: payload });
}

export function setSalesChannelActive(id: string, isActive: boolean) {
  return apiFetch<SalesChannel>(`/sales-channels/${id}/status`, { method: 'PATCH', json: { isActive } });
}
