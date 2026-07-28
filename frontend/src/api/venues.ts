import { apiFetch, VENUE_API_URL } from '@/lib/api-client';
import { Venue, VenueFullTree } from '@/lib/venue-types';

export function fetchVenues() {
  return apiFetch<Venue[]>('/venues', { baseUrl: VENUE_API_URL });
}

export function fetchVenue(id: string) {
  return apiFetch<Venue>(`/venues/${id}`, { baseUrl: VENUE_API_URL });
}

export function fetchVenueFullTree(id: string) {
  return apiFetch<VenueFullTree>(`/venues/${id}/full`, { baseUrl: VENUE_API_URL });
}

export interface VenuePayload {
  name: string;
  city?: string;
  address?: string;
}

export function createVenue(payload: VenuePayload) {
  return apiFetch<Venue>('/venues', { method: 'POST', json: payload, baseUrl: VENUE_API_URL });
}

export function updateVenue(id: string, payload: Partial<VenuePayload>) {
  return apiFetch<Venue>(`/venues/${id}`, { method: 'PATCH', json: payload, baseUrl: VENUE_API_URL });
}

export function deleteVenue(id: string) {
  return apiFetch<{ success: boolean }>(`/venues/${id}`, { method: 'DELETE', baseUrl: VENUE_API_URL });
}
