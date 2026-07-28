import { apiFetch, POS_API_URL } from '@/lib/api-client';
import { Order, PaymentMethod } from '@/lib/order-types';

export function fetchOrders(eventId?: string, channelId?: string) {
  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (channelId) params.set('channelId', channelId);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch<Order[]>(`/orders${qs}`, { baseUrl: POS_API_URL });
}

export function fetchOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`, { baseUrl: POS_API_URL });
}

export interface CheckoutItemInput {
  seatId: string;
  standId: string;
  zoneId: string;
  categoryId: string;
}

export interface CheckoutPayload {
  eventId: string;
  venueId: string;
  channelId: string;
  templateId: string;
  paymentMethod: PaymentMethod;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  items: CheckoutItemInput[];
}

export function checkout(payload: CheckoutPayload) {
  return apiFetch<Order>('/orders', { method: 'POST', json: payload, baseUrl: POS_API_URL });
}
