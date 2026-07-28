import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { Seat, SeatStatus } from '@/lib/venue-types';

export function fetchSeats(rowId?: string) {
  const qs = rowId ? `?rowId=${rowId}` : '';
  return apiFetch<Seat[]>(`/seats${qs}`, { baseUrl: VENUE_API_URL });
}

export interface UpdateSeatPayload {
  label?: string;
  x?: number;
  y?: number;
}

/** Repositionnement/étiquetage (droit `venues:update`) — pas le statut, voir updateSeatStatus. */
export function updateSeat(id: string, payload: UpdateSeatPayload) {
  return apiFetch<Seat>(`/seats/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

/** Changement d'état ponctuel (droit `venues:seats:manage`, accessible au Superviseur). */
export function updateSeatStatus(id: string, status: SeatStatus) {
  return apiFetch<Seat>(`/seats/${id}/status`, { method: 'PATCH', json: { status }, baseUrl: VENUE_API_URL });
}

export function deleteSeat(id: string) {
  return apiFetch<{ success: boolean }>(`/seats/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}

/** Action groupée : évite de cliquer siège par siège pour un rang entier endommagé. */
export function bulkUpdateSeatStatus(seatIds: string[], status: SeatStatus) {
  return apiFetch<{ updatedCount: number }>('/seats/bulk-status', {
    method: 'PATCH',
    json: { seatIds, status },
    baseUrl: VENUE_API_URL,
  });
}
