import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ServiceResponse<T> {
  status: number;
  data: T;
}

/**
 * Client HTTP vers les autres microservices, appelé lors de l'encaissement
 * (résolution tarif/jauge, disponibilité du siège, génération du billet).
 * Aucune authentification de service à service : le token de l'opérateur
 * (déjà porteur de ses permissions) est simplement transmis tel quel — même
 * principe de confiance qu'ailleurs dans le projet, pas de compte technique
 * séparé à gérer.
 */
@Injectable()
export class ServicesClient {
  constructor(private readonly config: ConfigService) {}

  private async request<T>(baseUrl: string, path: string, token: string, init?: RequestInit): Promise<ServiceResponse<T>> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
      });
    } catch {
      throw new BadGatewayException(`Service indisponible : ${baseUrl}`);
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    return { status: res.status, data: data as T };
  }

  private get venueBaseUrl() {
    return this.config.get<string>('VENUE_SERVICE_URL', 'http://localhost:3003');
  }

  private get eventsBaseUrl() {
    return this.config.get<string>('EVENTS_SERVICE_URL', 'http://localhost:3004');
  }

  private get ticketsBaseUrl() {
    return this.config.get<string>('TICKETS_SERVICE_URL', 'http://localhost:3005');
  }

  private get authBaseUrl() {
    return this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
  }

  getSeat(token: string, seatId: string) {
    return this.request<{ id: string; status: string; number: number; label: string | null }>(
      this.venueBaseUrl,
      `/seats/${seatId}`,
      token,
    );
  }

  setSeatStatus(token: string, seatId: string, status: string) {
    return this.request<{ id: string; status: string }>(this.venueBaseUrl, `/seats/${seatId}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  getEvent(token: string, eventId: string) {
    return this.request<{
      id: string;
      name: string;
      startAt: string;
      homeTeam: string | null;
      awayTeam: string | null;
      status: string;
      maxPerOrder: number | null;
      venueId: string;
    }>(this.eventsBaseUrl, `/events/${eventId}`, token);
  }

  resolvePrice(
    token: string,
    query: { eventId: string; categoryId: string; standId?: string; zoneId?: string; seatId?: string },
  ) {
    const params = new URLSearchParams(
      Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]),
    );
    return this.request<{ price: string }>(this.eventsBaseUrl, `/price-rules/resolve?${params}`, token);
  }

  listSalesQuotas(token: string, eventId: string) {
    return this.request<
      Array<{
        id: string;
        scope: 'EVENT' | 'STAND' | 'ZONE' | 'CHANNEL';
        standId: string | null;
        zoneId: string | null;
        channelId: string | null;
        categoryId: string | null;
        maxQuantity: number | null;
        isBlocked: boolean;
      }>
    >(this.eventsBaseUrl, `/sales-quotas?eventId=${eventId}`, token);
  }

  generateTicket(
    token: string,
    payload: { templateId: string; eventId: string; dataSnapshot: Record<string, unknown> },
  ) {
    return this.request<{ id: string; code: string }>(this.ticketsBaseUrl, '/tickets', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Achat public (E-Ticket-Pay, module Réservation & Achat) : mêmes services,
  // routes distinctes, appelées avec le token du client final. ---

  getPublishedEvent(token: string, eventId: string) {
    return this.request<{
      id: string;
      name: string;
      startAt: string;
      homeTeam: string | null;
      awayTeam: string | null;
      status: string;
      maxPerOrder: number | null;
      venueId: string;
    }>(this.eventsBaseUrl, `/events/public/${eventId}`, token);
  }

  listPublicSalesQuotas(token: string, eventId: string) {
    return this.request<
      Array<{
        id: string;
        scope: 'EVENT' | 'STAND' | 'ZONE' | 'CHANNEL';
        standId: string | null;
        zoneId: string | null;
        channelId: string | null;
        categoryId: string | null;
        maxQuantity: number | null;
        isBlocked: boolean;
      }>
    >(this.eventsBaseUrl, `/sales-quotas/public?eventId=${eventId}`, token);
  }

  getWebSalesChannel(token: string) {
    return this.request<{ id: string; name: string; type: string }>(this.authBaseUrl, '/sales-channels/web', token);
  }

  /** Transition vérifiée par le hold Redis (AVAILABLE->SOLD) ou compensation (SOLD->AVAILABLE) — voir venue-service SeatsService.publicUpdateStatus. */
  setSeatStatusPublic(token: string, seatId: string, status: 'SOLD' | 'AVAILABLE') {
    return this.request<{ id: string; status: string }>(
      this.venueBaseUrl,
      `/seats/${seatId}/public-status`,
      token,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  }

  generateTicketForCustomer(
    token: string,
    payload: { templateId: string; eventId: string; dataSnapshot: Record<string, unknown> },
  ) {
    return this.request<{ id: string; code: string }>(this.ticketsBaseUrl, '/tickets/customer-purchase', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
