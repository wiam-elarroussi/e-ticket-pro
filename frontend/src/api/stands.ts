import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { Stand } from '@/lib/venue-types';

export function fetchStands(venueId?: string) {
  const qs = venueId ? `?venueId=${venueId}` : '';
  return apiFetch<Stand[]>(`/stands${qs}`, { baseUrl: VENUE_API_URL });
}

export function fetchStand(id: string) {
  return apiFetch<Stand>(`/stands/${id}`, { baseUrl: VENUE_API_URL });
}

export interface StandPayload {
  venueId: string;
  name: string;
  orderIndex?: number;
}

export function createStand(payload: StandPayload) {
  return apiFetch<Stand>('/stands', { method: 'POST', json: payload, baseUrl: VENUE_API_URL });
}

export function updateStand(id: string, payload: Partial<Omit<StandPayload, 'venueId'>>) {
  return apiFetch<Stand>(`/stands/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

export function deleteStand(id: string) {
  return apiFetch<{ success: boolean }>(`/stands/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}
