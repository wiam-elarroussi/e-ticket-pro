import { apiFetch, EVENTS_API_URL } from '@/lib/api-client';
import { AccreditationType, TicketCategory } from '@/lib/pricing-types';

export function fetchTicketCategories() {
  return apiFetch<TicketCategory[]>('/ticket-categories', { baseUrl: EVENTS_API_URL });
}

export interface TicketCategoryPayload {
  code: string;
  name: string;
  isFree?: boolean;
  requiresNominativeInfo?: boolean;
  accreditationType?: AccreditationType;
}

export function createTicketCategory(payload: TicketCategoryPayload) {
  return apiFetch<TicketCategory>('/ticket-categories', { method: 'POST', json: payload, baseUrl: EVENTS_API_URL });
}

export function updateTicketCategory(id: string, payload: Partial<Omit<TicketCategoryPayload, 'code'>>) {
  return apiFetch<TicketCategory>(`/ticket-categories/${id}`, {
    method: 'PATCH',
    json: payload,
    baseUrl: EVENTS_API_URL,
  });
}

export function deleteTicketCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/ticket-categories/${id}`, { method: 'DELETE', baseUrl: EVENTS_API_URL });
}
