import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ServiceResponse<T> {
  status: number;
  data: T;
}

export interface RemoteEvent {
  id: string;
  name: string;
  type: string;
  homeTeam: string | null;
  awayTeam: string | null;
  venueId: string;
  status: string;
  startAt: string;
  endAt: string;
}

export interface RemoteSeat {
  id: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'OUT_OF_SERVICE';
}

export interface RemoteVenueFullTree {
  id: string;
  name: string;
  stands: Array<{ zones: Array<{ rows: Array<{ seats: RemoteSeat[] }> }> }>;
}

export interface RemoteTicket {
  id: string;
  eventId: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
}

export interface RemoteOrder {
  id: string;
  eventId: string;
  venueId: string;
  channelId: string;
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: 'CASH' | 'CARD' | 'VOUCHER';
  totalAmount: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  createdAt: string;
  items: Array<{ id: string }>;
}

export interface RemoteAccessLog {
  id: string;
  eventId: string;
  gateId: string;
  scanType: 'TICKET' | 'SUBSCRIPTION';
  result: 'VALID' | 'ALREADY_SCANNED' | 'INVALID' | 'CANCELLED' | 'WRONG_EVENT' | 'OVERRIDDEN';
  scannedAt: string;
  latencyMs?: number | null;
}

export interface RemoteSalesChannel {
  id: string;
  partnerId: string | null;
  name: string;
}

export interface RemoteSubscription {
  id: string;
  formulaId: string;
  holderName: string;
  holderEmail: string | null;
  holderPhone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
}

/**
 * Client HTTP en lecture seule vers les 5 autres microservices — ce service
 * n'a pas sa propre base de données, il agrège à la volée pour les tableaux
 * de bord, comparatifs et exports (module 7). Même principe de confiance que
 * partout ailleurs dans le projet : le token de l'opérateur est transmis tel
 * quel, aucun compte technique séparé.
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
      return { status: 503, data: [] as unknown as T };
    }
    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : undefined;
      return { status: res.status, data: data as T };
    } catch {
      return { status: res.status, data: [] as unknown as T };
    }
  }

  private get venueBaseUrl() {
    return this.config.get<string>('VENUE_SERVICE_URL', 'http://localhost:3003');
  }
  private get eventsBaseUrl() {
    return this.config.get<string>('EVENTS_SERVICE_URL', 'http://localhost:3002');
  }
  private get ticketsBaseUrl() {
    return this.config.get<string>('TICKETS_SERVICE_URL', 'http://localhost:3002');
  }
  private get posBaseUrl() {
    return this.config.get<string>('POS_SERVICE_URL', 'http://localhost:3004');
  }
  private get accessBaseUrl() {
    return this.config.get<string>('ACCESS_SERVICE_URL', 'http://localhost:3007');
  }
  private get authBaseUrl() {
    return this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
  }

  listEvents(token: string, venueId?: string) {
    return this.request<RemoteEvent[]>(this.eventsBaseUrl, `/events${venueId ? `?venueId=${venueId}` : ''}`, token);
  }

  getEvent(token: string, eventId: string) {
    return this.request<RemoteEvent>(this.eventsBaseUrl, `/events/${eventId}`, token);
  }

  getVenueFullTree(token: string, venueId: string) {
    return this.request<RemoteVenueFullTree>(this.venueBaseUrl, `/venues/${venueId}/full`, token);
  }

  listTickets(token: string, eventId?: string) {
    return this.request<RemoteTicket[]>(this.ticketsBaseUrl, `/tickets${eventId ? `?eventId=${eventId}` : ''}`, token);
  }

  listOrders(token: string, eventId?: string) {
    return this.request<RemoteOrder[]>(this.posBaseUrl, `/orders${eventId ? `?eventId=${eventId}` : ''}`, token);
  }

  listAccessLogs(token: string, eventId: string) {
    return this.request<RemoteAccessLog[]>(this.accessBaseUrl, `/access/logs?eventId=${eventId}`, token);
  }

  listSalesChannels(token: string) {
    return this.request<RemoteSalesChannel[]>(this.authBaseUrl, `/sales-channels`, token);
  }

  listSubscriptions(token: string) {
    return this.request<RemoteSubscription[]>(this.eventsBaseUrl, `/subscriptions`, token);
  }
}
