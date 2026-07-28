import { apiFetch, EVENTS_API_URL } from '@/lib/api-client';
import { PriceRule, PriceScope } from '@/lib/pricing-types';

export function fetchPriceRules(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : '';
  return apiFetch<PriceRule[]>(`/price-rules${qs}`, { baseUrl: EVENTS_API_URL });
}

export interface PriceRulePayload {
  eventId: string;
  categoryId: string;
  scope: PriceScope;
  standId?: string;
  zoneId?: string;
  seatId?: string;
  price: number;
  validFrom?: string;
  validTo?: string;
}

export function createPriceRule(payload: PriceRulePayload) {
  return apiFetch<PriceRule>('/price-rules', { method: 'POST', json: payload, baseUrl: EVENTS_API_URL });
}

export function updatePriceRule(
  id: string,
  payload: Partial<Pick<PriceRulePayload, 'price' | 'validFrom' | 'validTo'>>,
) {
  return apiFetch<PriceRule>(`/price-rules/${id}`, { method: 'PATCH', json: payload, baseUrl: EVENTS_API_URL });
}

export function deletePriceRule(id: string) {
  return apiFetch<{ success: boolean }>(`/price-rules/${id}`, { method: 'DELETE', baseUrl: EVENTS_API_URL });
}

export interface ResolvePriceQuery {
  eventId: string;
  categoryId: string;
  standId?: string;
  zoneId?: string;
  seatId?: string;
}

/** Aperçu du tarif applicable (résolution faisant autorité côté serveur à l'encaissement). */
export function resolvePrice(query: ResolvePriceQuery) {
  const params = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]),
  );
  return apiFetch<PriceRule>(`/price-rules/resolve?${params}`, { baseUrl: EVENTS_API_URL });
}
