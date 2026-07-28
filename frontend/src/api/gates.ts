import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { Gate } from '@/lib/venue-types';

export function fetchGates(venueId?: string) {
  const qs = venueId ? `?venueId=${venueId}` : '';
  return apiFetch<Gate[]>(`/gates${qs}`, { baseUrl: VENUE_API_URL });
}

export interface GatePayload {
  venueId: string;
  name: string;
  code?: string;
  description?: string;
}

export function createGate(payload: GatePayload) {
  return apiFetch<Gate>('/gates', { method: 'POST', json: payload, baseUrl: VENUE_API_URL });
}

export function updateGate(id: string, payload: Partial<Omit<GatePayload, 'venueId'>>) {
  return apiFetch<Gate>(`/gates/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

export function deleteGate(id: string) {
  return apiFetch<{ success: boolean }>(`/gates/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}
