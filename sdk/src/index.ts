/**
 * SDK TypeScript E-Ticket Pro — interfaçage tiers (Ticketmaster, FIFA Ticketing,
 * partenaires billetterie). Cf. attestation de conformité §1 "Fourniture d'API
 * et SDK". Ce client couvre exactement la surface publique déjà exposée et
 * vérifiée par l'application E-Ticket-Pay elle-même (catalogue, réservation,
 * paiement, abonnements, cashless) — aucune fonctionnalité inventée : chaque
 * méthode correspond à un endpoint réel des microservices E-Ticket Pro,
 * documenté en OpenAPI sur /api-docs de chaque service.
 *
 * Architecture microservices : pas de passerelle API unique, chaque service a
 * son propre port. Le client accepte les URLs de base de chacun.
 */

export interface EticketProClientConfig {
  authBaseUrl: string;
  eventsBaseUrl: string;
  venueBaseUrl: string;
  posBaseUrl: string;
}

export interface CustomerTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface EticketEvent {
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

export interface SeatHold {
  seatId: string;
  heldUntil: string;
}

export interface OrderItemInput {
  seatId: string;
  standId: string;
  zoneId: string;
  categoryId: string;
}

export interface PublicOrder {
  id: string;
  eventId: string;
  totalAmount: string;
  paymentMethod: string;
  items: Array<{
    id: string;
    seatId: string;
    categoryId: string;
    ticketId: string;
    ticketCode: string | null;
    unitPrice: string;
  }>;
}

export interface SubscriptionFormula {
  id: string;
  code: string;
  name: string;
  price: string;
  validFrom: string;
  validTo: string;
}

export interface Wallet {
  id: string;
  customerId: string;
  balance: string;
}

export class EticketProApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'EticketProApiError';
  }
}

export class EticketProClient {
  constructor(private readonly config: EticketProClientConfig) {}

  private async request<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const contentType = res.headers.get('content-type');
    const data = contentType?.includes('application/json') ? await res.json() : undefined;
    if (!res.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? res.statusText);
      throw new EticketProApiError(res.status, message);
    }
    return data as T;
  }

  private auth(token: string): RequestInit {
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // --- Authentification client (customer) ---

  register(input: { email: string; password: string; fullName: string; phone?: string }) {
    return this.request<{ id: string; email: string; fullName: string }>(this.config.authBaseUrl, '/customers/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  login(email: string, password: string) {
    return this.request<CustomerTokens>(this.config.authBaseUrl, '/customers/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  refresh(refreshToken: string) {
    return this.request<CustomerTokens>(this.config.authBaseUrl, '/customers/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // --- Catalogue public (événements, enceintes, tarifs) ---

  listPublishedEvents() {
    return this.request<EticketEvent[]>(this.config.eventsBaseUrl, '/events/public');
  }

  getEvent(eventId: string) {
    return this.request<EticketEvent>(this.config.eventsBaseUrl, `/events/public/${eventId}`);
  }

  getVenueFullTree(venueId: string) {
    return this.request<unknown>(this.config.venueBaseUrl, `/venues/${venueId}/full`);
  }

  resolvePrice(eventId: string, seatId: string) {
    return this.request<{ price: string; categoryId: string }>(
      this.config.eventsBaseUrl,
      `/price-rules/resolve?eventId=${eventId}&seatId=${seatId}`,
    );
  }

  // --- Réservation & achat ---

  holdSeat(seatId: string, token: string) {
    return this.request<SeatHold>(this.config.venueBaseUrl, `/seats/${seatId}/hold`, {
      method: 'POST',
      ...this.auth(token),
    });
  }

  releaseSeat(seatId: string, token: string) {
    return this.request<{ success: boolean }>(this.config.venueBaseUrl, `/seats/${seatId}/hold`, {
      method: 'DELETE',
      ...this.auth(token),
    });
  }

  checkout(
    input: {
      eventId: string;
      venueId: string;
      templateId: string;
      paymentMethod?: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY';
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      items: OrderItemInput[];
    },
    token: string,
  ) {
    return this.request<PublicOrder>(this.config.posBaseUrl, '/orders/public-checkout', {
      method: 'POST',
      body: JSON.stringify(input),
      ...this.auth(token),
    });
  }

  // --- Abonnements ---

  listSubscriptionFormulas(venueId?: string) {
    const qs = venueId ? `?venueId=${venueId}` : '';
    return this.request<SubscriptionFormula[]>(this.config.eventsBaseUrl, `/subscription-formulas/public${qs}`);
  }

  purchaseSubscription(
    input: { formulaId: string; holderName: string; holderEmail?: string; holderPhone?: string },
    token: string,
  ) {
    return this.request<unknown>(this.config.eventsBaseUrl, '/subscriptions/public-purchase', {
      method: 'POST',
      body: JSON.stringify(input),
      ...this.auth(token),
    });
  }

  // --- Cashless ---

  getWallet(token: string) {
    return this.request<Wallet>(this.config.posBaseUrl, '/wallet', this.auth(token));
  }

  topupWallet(amount: number, token: string, paymentMethod?: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY') {
    return this.request<{ wallet: Wallet }>(this.config.posBaseUrl, '/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod }),
      ...this.auth(token),
    });
  }
}
