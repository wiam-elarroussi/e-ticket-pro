import { apiFetch, TICKETS_API_URL } from '@/lib/api-client';
import { TemplateElement, TicketTemplate } from '@/lib/template-types';

export function fetchTicketTemplates() {
  return apiFetch<TicketTemplate[]>('/ticket-templates', { baseUrl: TICKETS_API_URL });
}

export function fetchTicketTemplate(id: string) {
  return apiFetch<TicketTemplate>(`/ticket-templates/${id}`, { baseUrl: TICKETS_API_URL });
}

export interface TicketTemplatePayload {
  name: string;
  description?: string;
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  elements?: TemplateElement[];
}

export function createTicketTemplate(payload: TicketTemplatePayload) {
  return apiFetch<TicketTemplate>('/ticket-templates', { method: 'POST', json: payload, baseUrl: TICKETS_API_URL });
}

export function updateTicketTemplate(id: string, payload: Partial<TicketTemplatePayload>) {
  return apiFetch<TicketTemplate>(`/ticket-templates/${id}`, {
    method: 'PATCH',
    json: payload,
    baseUrl: TICKETS_API_URL,
  });
}

export function deleteTicketTemplate(id: string) {
  return apiFetch<{ success: boolean }>(`/ticket-templates/${id}`, { method: 'DELETE', baseUrl: TICKETS_API_URL });
}
