import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { GateZoneAccess, MapPoint, Zone } from '@/lib/venue-types';

export function fetchZones(standId?: string) {
  const qs = standId ? `?standId=${standId}` : '';
  return apiFetch<Zone[]>(`/zones${qs}`, { baseUrl: VENUE_API_URL });
}

export function fetchZone(id: string) {
  return apiFetch<Zone>(`/zones/${id}`, { baseUrl: VENUE_API_URL });
}

export interface ZonePayload {
  standId: string;
  name: string;
  colorHex?: string;
}

export function createZone(payload: ZonePayload) {
  return apiFetch<Zone>('/zones', { method: 'POST', json: payload, baseUrl: VENUE_API_URL });
}

export function updateZone(id: string, payload: Partial<Omit<ZonePayload, 'standId'>>) {
  return apiFetch<Zone>(`/zones/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

export function updateZonePolygon(id: string, points: MapPoint[]) {
  return apiFetch<Zone>(`/zones/${id}/polygon`, { method: 'PATCH', json: { points }, baseUrl: VENUE_API_URL });
}

export function setZoneGateAccess(id: string, gateIds: string[]) {
  return apiFetch<GateZoneAccess[]>(`/zones/${id}/gate-access`, {
    method: 'PUT',
    json: { gateIds },
    baseUrl: VENUE_API_URL,
  });
}

export function deleteZone(id: string) {
  return apiFetch<{ success: boolean }>(`/zones/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}
