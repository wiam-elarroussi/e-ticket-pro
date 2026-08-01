import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ServiceResponse<T> {
  status: number;
  data: T;
}

/**
 * Client HTTP vers events-service (accès abonné) et tickets-service
 * (vérification checksum + existence du billet), appelé à chaque scan. Le
 * token de l'opérateur/contrôleur est transmis tel quel — même principe de
 * confiance qu'ailleurs dans le projet.
 */
@Injectable()
export class ServicesClient {
  constructor(private readonly config: ConfigService) {}

  private async request<T>(baseUrl: string, path: string, token: string): Promise<ServiceResponse<T>> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new BadGatewayException(`Service indisponible : ${baseUrl}`);
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    return { status: res.status, data: data as T };
  }

  private get eventsBaseUrl() {
    return this.config.get<string>('EVENTS_SERVICE_URL', 'http://localhost:3004');
  }

  private get ticketsBaseUrl() {
    return this.config.get<string>('TICKETS_SERVICE_URL', 'http://localhost:3005');
  }

  private get venueBaseUrl() {
    return this.config.get<string>('VENUE_SERVICE_URL', 'http://localhost:3003');
  }

  /** Contrôle d'accréditation physique (module 6) : la porte scannée dessert-elle
   * bien la zone du siège de ce billet ? cf. gates.service.ts#checkZoneAccess. */
  checkGateZoneAccess(token: string, gateId: string, seatId: string) {
    return this.request<{ allowed: boolean; zoneId: string; zoneName: string; restricted: boolean }>(
      this.venueBaseUrl,
      `/gates/${gateId}/zone-check?seatId=${seatId}`,
      token,
    );
  }

  verifyTicketCode(token: string, code: string) {
    return this.request<{
      checksumValid: boolean;
      exists: boolean;
      ticket: {
        id: string;
        eventId: string | null;
        status: 'ACTIVE' | 'CANCELLED';
        dataSnapshot: Record<string, unknown>;
      } | null;
    }>(this.ticketsBaseUrl, `/tickets/verify?code=${encodeURIComponent(code)}`, token);
  }

  verifyTicketNfc(token: string, nfcTagId: string) {
    return this.request<{
      exists: boolean;
      ticket: {
        id: string;
        eventId: string | null;
        status: 'ACTIVE' | 'CANCELLED';
        dataSnapshot: Record<string, unknown>;
      } | null;
    }>(this.ticketsBaseUrl, `/tickets/verify-nfc?nfcTagId=${encodeURIComponent(nfcTagId)}`, token);
  }

  checkSubscriptionAccess(token: string, subscriptionId: string, eventId: string) {
    return this.request<{ granted: boolean; reason: string | null; seatId?: string | null }>(
      this.eventsBaseUrl,
      `/subscriptions/${subscriptionId}/access?eventId=${eventId}`,
      token,
    );
  }

  /** Liste blanche/noire pour un événement (module 6.3) — export en masse pour caching hors-ligne côté porte/PDA. */
  listTicketsForEvent(token: string, eventId: string) {
    return this.request<
      Array<{ id: string; code: string; checksum: string; status: 'ACTIVE' | 'CANCELLED'; nfcTagId: string | null }>
    >(this.ticketsBaseUrl, `/tickets?eventId=${eventId}`, token);
  }
}
