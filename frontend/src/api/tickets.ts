import { apiFetch, TICKETS_API_URL } from '@/lib/api-client';
import { GeneratedTicket, VerifyCodeResult } from '@/lib/ticket-types';

export function fetchTickets(templateId?: string) {
  const qs = templateId ? `?templateId=${templateId}` : '';
  return apiFetch<GeneratedTicket[]>(`/tickets${qs}`, { baseUrl: TICKETS_API_URL });
}

export function fetchTicket(id: string) {
  return apiFetch<GeneratedTicket>(`/tickets/${id}`, { baseUrl: TICKETS_API_URL });
}

export interface CreateTicketPayload {
  templateId: string;
  eventId?: string;
  seatId?: string;
  dataSnapshot: Record<string, unknown>;
  nfcTagId?: string;
}

export function createTicket(payload: CreateTicketPayload) {
  return apiFetch<GeneratedTicket>('/tickets', { method: 'POST', json: payload, baseUrl: TICKETS_API_URL });
}

export function fetchCodeImage(id: string, type: 'qrcode' | 'barcode') {
  return apiFetch<{ dataUrl: string }>(`/tickets/${id}/code-image?type=${type}`, { baseUrl: TICKETS_API_URL });
}

export function reprintTicket(id: string) {
  return apiFetch<GeneratedTicket>(`/tickets/${id}/reprint`, { method: 'PATCH', baseUrl: TICKETS_API_URL });
}

/** Liste noire (module 6) : le billet échouera désormais la validation au scan. */
export function cancelTicket(id: string) {
  return apiFetch<GeneratedTicket>(`/tickets/${id}/cancel`, { method: 'PATCH', baseUrl: TICKETS_API_URL });
}

export function verifyCode(code: string) {
  return apiFetch<VerifyCodeResult>(`/tickets/verify?code=${encodeURIComponent(code)}`, { baseUrl: TICKETS_API_URL });
}
