import { apiFetch, EVENTS_API_URL } from '@/lib/api-client';
import { AccessCheckResult, Subscription, SubscriptionStatus } from '@/lib/subscription-types';

export function fetchSubscriptions(formulaId?: string) {
  const qs = formulaId ? `?formulaId=${formulaId}` : '';
  return apiFetch<Subscription[]>(`/subscriptions${qs}`, { baseUrl: EVENTS_API_URL });
}

export function fetchSubscription(id: string) {
  return apiFetch<Subscription>(`/subscriptions/${id}`, { baseUrl: EVENTS_API_URL });
}

export interface SubscriptionPayload {
  formulaId: string;
  holderName: string;
  holderEmail?: string;
  holderPhone?: string;
  seatId?: string;
  nfcTagId?: string;
}

export function createSubscription(payload: SubscriptionPayload) {
  return apiFetch<Subscription>('/subscriptions', { method: 'POST', json: payload, baseUrl: EVENTS_API_URL });
}

export interface UpdateSubscriptionPayload {
  holderName?: string;
  holderEmail?: string;
  holderPhone?: string;
  seatId?: string;
  nfcTagId?: string;
  status?: SubscriptionStatus;
}

export function updateSubscription(id: string, payload: UpdateSubscriptionPayload) {
  return apiFetch<Subscription>(`/subscriptions/${id}`, { method: 'PATCH', json: payload, baseUrl: EVENTS_API_URL });
}

/** "Activation automatique de l'entrée" : vérifie si l'abonnement donne accès à un événement donné. */
export function checkSubscriptionAccess(id: string, eventId: string) {
  return apiFetch<AccessCheckResult>(`/subscriptions/${id}/access?eventId=${eventId}`, { baseUrl: EVENTS_API_URL });
}
