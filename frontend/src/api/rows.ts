import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { NumberingDirection, Row, Seat } from '@/lib/venue-types';

export function fetchRows(zoneId?: string) {
  const qs = zoneId ? `?zoneId=${zoneId}` : '';
  return apiFetch<Row[]>(`/rows${qs}`, { baseUrl: VENUE_API_URL });
}

export interface RowPayload {
  zoneId: string;
  label: string;
  orderIndex?: number;
}

export function createRow(payload: RowPayload) {
  return apiFetch<Row>('/rows', { method: 'POST', json: payload, baseUrl: VENUE_API_URL });
}

export function updateRow(
  id: string,
  payload: Partial<Omit<RowPayload, 'zoneId'>> & { numberingDirection?: NumberingDirection },
) {
  return apiFetch<Row>(`/rows/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

export function deleteRow(id: string) {
  return apiFetch<{ success: boolean }>(`/rows/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}

export interface GenerateSeatsPayload {
  count: number;
  startNumber?: number;
  direction?: NumberingDirection;
  replaceExisting?: boolean;
}

export function generateSeats(rowId: string, payload: GenerateSeatsPayload) {
  return apiFetch<Seat[]>(`/rows/${rowId}/seats/generate`, {
    method: 'POST',
    json: payload,
    baseUrl: VENUE_API_URL,
  });
}
