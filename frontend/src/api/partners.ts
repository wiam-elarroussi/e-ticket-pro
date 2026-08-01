import { apiFetch } from '@/lib/api-client';
import { Partner, PartnerStatus } from '@/lib/types';

export function fetchPartners() {
  return apiFetch<Partner[]>('/partners');
}

export function fetchPartner(id: string) {
  return apiFetch<Partner>(`/partners/${id}`);
}

export function fetchArchivedPartners() {
  return apiFetch<Partner[]>('/partners/archives');
}

export interface PartnerPayload {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export function createPartner(payload: PartnerPayload) {
  return apiFetch<Partner>('/partners', { method: 'POST', json: payload });
}

export function updatePartner(id: string, payload: Partial<PartnerPayload>) {
  return apiFetch<Partner>(`/partners/${id}`, { method: 'PATCH', json: payload });
}

export function setPartnerStatus(id: string, status: PartnerStatus) {
  return apiFetch<Partner>(`/partners/${id}/status`, { method: 'PATCH', json: { status } });
}

export function archivePartner(id: string) {
  return apiFetch<Partner>(`/partners/${id}/archive`, { method: 'PATCH' });
}

export function restorePartner(id: string) {
  return apiFetch<Partner>(`/partners/${id}/restore`, { method: 'PATCH' });
}

export function hardDeletePartner(id: string) {
  return apiFetch<{ success: boolean }>(`/partners/${id}`, { method: 'DELETE' });
}

/** Portail partenaire (module 4) : émet une nouvelle clé API — affichée en clair une seule fois. */
export function generatePartnerApiKey(id: string) {
  return apiFetch<{ apiKey: string }>(`/partners/${id}/api-key`, { method: 'POST' });
}
