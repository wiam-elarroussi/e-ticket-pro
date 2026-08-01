import { apiFetch, uploadFile, EVENTS_API_URL } from '@/lib/api-client';
import { Event, EventStatus, EventType } from '@/lib/event-types';

export function fetchEvents(venueId?: string) {
  const qs = venueId ? `?venueId=${venueId}` : '';
  return apiFetch<Event[]>(`/events${qs}`, { baseUrl: EVENTS_API_URL });
}

export function fetchEvent(id: string) {
  return apiFetch<Event>(`/events/${id}`, { baseUrl: EVENTS_API_URL });
}

export interface EventPayload {
  name: string;
  type: EventType;
  homeTeam?: string;
  awayTeam?: string;
  venueId: string;
  status?: EventStatus;
  startAt: string;
  endAt: string;
  salesOpenAt?: string;
  salesCloseAt?: string;
  maxPerOrder?: number;
  imageUrl?: string;
}

/** Upload de l'affiche — retourne le chemin à inclure dans EventPayload.imageUrl. */
export function uploadEventImage(file: File) {
  return uploadFile<{ url: string }>('/events/upload-image', EVENTS_API_URL, file);
}

export function createEvent(payload: EventPayload) {
  return apiFetch<Event>('/events', { method: 'POST', json: payload, baseUrl: EVENTS_API_URL });
}

export function updateEvent(id: string, payload: Partial<EventPayload>) {
  return apiFetch<Event>(`/events/${id}`, { method: 'PATCH', json: payload, baseUrl: EVENTS_API_URL });
}

export function deleteEvent(id: string) {
  return apiFetch<{ success: boolean }>(`/events/${id}`, { method: 'DELETE', baseUrl: EVENTS_API_URL });
}
