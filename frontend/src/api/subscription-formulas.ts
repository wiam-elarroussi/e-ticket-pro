import { apiFetch, EVENTS_API_URL } from '@/lib/api-client';
import { SubscriptionFormula, SubscriptionFormulaEvent, SubscriptionFormulaType } from '@/lib/subscription-types';

export function fetchSubscriptionFormulas(venueId?: string) {
  const qs = venueId ? `?venueId=${venueId}` : '';
  return apiFetch<SubscriptionFormula[]>(`/subscription-formulas${qs}`, { baseUrl: EVENTS_API_URL });
}

export function fetchSubscriptionFormula(id: string) {
  return apiFetch<SubscriptionFormula>(`/subscription-formulas/${id}`, { baseUrl: EVENTS_API_URL });
}

export interface SubscriptionFormulaPayload {
  name: string;
  type: SubscriptionFormulaType;
  venueId: string;
  price: number;
  validFrom: string;
  validTo: string;
  eventIds?: string[];
  globalAccess?: boolean;
}

export function createSubscriptionFormula(payload: SubscriptionFormulaPayload) {
  return apiFetch<SubscriptionFormula>('/subscription-formulas', {
    method: 'POST',
    json: payload,
    baseUrl: EVENTS_API_URL,
  });
}

export function updateSubscriptionFormula(
  id: string,
  payload: Partial<Omit<SubscriptionFormulaPayload, 'type' | 'venueId' | 'eventIds'>>,
) {
  return apiFetch<SubscriptionFormula>(`/subscription-formulas/${id}`, {
    method: 'PATCH',
    json: payload,
    baseUrl: EVENTS_API_URL,
  });
}

export function setFormulaIncludedEvents(id: string, eventIds: string[]) {
  return apiFetch<SubscriptionFormulaEvent[]>(`/subscription-formulas/${id}/events`, {
    method: 'PUT',
    json: { eventIds },
    baseUrl: EVENTS_API_URL,
  });
}

export function deleteSubscriptionFormula(id: string) {
  return apiFetch<{ success: boolean }>(`/subscription-formulas/${id}`, {
    method: 'DELETE',
    baseUrl: EVENTS_API_URL,
  });
}
