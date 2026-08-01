import { Injectable, NotFoundException } from '@nestjs/common';
import { ServicesClient, RemoteOrder, RemoteSalesChannel } from '../integrations/services-client';

const ACCESS_RESULTS = ['VALID', 'ALREADY_SCANNED', 'INVALID', 'CANCELLED', 'WRONG_EVENT', 'OVERRIDDEN'] as const;

function sumCompletedOrders(orders: RemoteOrder[]): number {
  return orders.filter((o) => o.status === 'COMPLETED').reduce((sum, o) => sum + Number(o.totalAmount), 0);
}

function channelName(channels: RemoteSalesChannel[], channelId: string): string {
  return channels.find((c) => c.id === channelId)?.name ?? 'Canal inconnu/supprimé';
}

@Injectable()
export class ReportsService {
  constructor(private readonly services: ServicesClient) {}

  /**
   * 7.1 — Tableau de bord live d'un événement : jauge de remplissage, chiffre
   * d'affaires par canal, flux de contrôle d'accès. Pas de WebSocket pour ce
   * premier jet (le frontend rafraîchit par polling) — cohérent avec les
   * autres simplifications assumées du projet (ex: scan manuel avant caméra).
   */
  async getDashboard(token: string, eventId: string) {
    const eventRes = await this.services.getEvent(token, eventId);
    if (eventRes.status === 404 || !eventRes.data) {
      throw new NotFoundException('Événement introuvable');
    }
    const event = eventRes.data;

    const [venueRes, ticketsRes, ordersRes, accessRes, channelsRes] = await Promise.all([
      this.services.getVenueFullTree(token, event.venueId),
      this.services.listTickets(token, eventId),
      this.services.listOrders(token, eventId),
      this.services.listAccessLogs(token, eventId),
      this.services.listSalesChannels(token),
    ]);

    const stands = venueRes.data?.stands ?? [];
    const seats = stands.flatMap((s) =>
      (s.zones ?? []).flatMap((z) => (z.rows ?? []).flatMap((r) => r.seats ?? []))
    );
    const totalSeats = seats.length;
    const soldSeats = seats.filter((s) => s.status === 'SOLD').length;

    const tickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
    const rawOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    const orders = rawOrders.filter((o) => o.eventId === eventId);
    const channels = Array.isArray(channelsRes.data) ? channelsRes.data : [];

    const revenueByChannelMap = new Map<string, { amount: number; orderCount: number }>();
    for (const order of orders) {
      if (order.status !== 'COMPLETED') continue;
      const entry = revenueByChannelMap.get(order.channelId) ?? { amount: 0, orderCount: 0 };
      entry.amount += Number(order.totalAmount);
      entry.orderCount += 1;
      revenueByChannelMap.set(order.channelId, entry);
    }
    const revenueByChannel = Array.from(revenueByChannelMap.entries())
      .map(([channelId, v]) => ({ channelId, channelName: channelName(channels, channelId), ...v }))
      .sort((a, b) => b.amount - a.amount);

    const accessLogs = Array.isArray(accessRes.data) ? accessRes.data : [];
    const accessCounts = Object.fromEntries(
      ACCESS_RESULTS.map((r) => [r, accessLogs.filter((l) => l.result === r).length]),
    ) as Record<(typeof ACCESS_RESULTS)[number], number>;
    const latencies = accessLogs.map((l) => l.latencyMs).filter((v): v is number => typeof v === 'number');
    const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

    return {
      event: { id: event.id, name: event.name, startAt: event.startAt, status: event.status },
      occupancy: {
        totalSeats,
        soldSeats,
        occupancyRate: totalSeats > 0 ? soldSeats / totalSeats : 0,
      },
      tickets: {
        total: tickets.length,
        active: tickets.filter((t) => t.status === 'ACTIVE').length,
        cancelled: tickets.filter((t) => t.status === 'CANCELLED').length,
      },
      revenue: {
        total: sumCompletedOrders(orders),
        orderCount: orders.filter((o) => o.status === 'COMPLETED').length,
        byChannel: revenueByChannel,
      },
      access: {
        counts: accessCounts,
        entriesGranted: accessCounts.VALID + accessCounts.OVERRIDDEN,
        avgLatencyMs,
      },
    };
  }

  /**
   * 7.2 (partiel) — Comparatif chiffre d'affaires / billets vendus entre plusieurs
   * événements (ex: Match A vs Match B). L'analyse démographique/géographique
   * demandée par le cahier des charges (âge, genre, région des acheteurs) n'est
   * PAS implémentée : aucune de ces données n'est capturée nulle part dans le
   * système (l'acheteur n'a que nom/email/téléphone) — l'ajouter nécessiterait
   * de collecter de nouvelles données, pas juste un nouveau rapport.
   */
  async compareEvents(token: string, eventIds: string[]) {
    const results = await Promise.all(
      eventIds.map(async (eventId) => {
        const [eventRes, ticketsRes, ordersRes] = await Promise.all([
          this.services.getEvent(token, eventId),
          this.services.listTickets(token, eventId),
          this.services.listOrders(token, eventId),
        ]);
        if (!eventRes.data) return null;
        const rawOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const rawTickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
        const orders = rawOrders.filter((o) => o.eventId === eventId);
        return {
          eventId,
          name: eventRes.data.name,
          startAt: eventRes.data.startAt,
          ticketsSold: rawTickets.filter((t) => t.status === 'ACTIVE').length,
          revenue: sumCompletedOrders(orders),
          orderCount: orders.filter((o) => o.status === 'COMPLETED').length,
        };
      }),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /** 7.2 — Répartition des ventes par canal (guichet local, web, partenaires), globale ou pour un événement. */
  async getChannelBreakdown(token: string, eventId?: string) {
    const [ordersRes, channelsRes] = await Promise.all([
      this.services.listOrders(token, eventId),
      this.services.listSalesChannels(token),
    ]);
    const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    const channels = Array.isArray(channelsRes.data) ? channelsRes.data : [];

    const map = new Map<string, { amount: number; orderCount: number; ticketCount: number }>();
    for (const order of orders) {
      if (order.status !== 'COMPLETED') continue;
      const entry = map.get(order.channelId) ?? { amount: 0, orderCount: 0, ticketCount: 0 };
      entry.amount += Number(order.totalAmount);
      entry.orderCount += 1;
      entry.ticketCount += order.items.length;
      map.set(order.channelId, entry);
    }

    return Array.from(map.entries())
      .map(([channelId, v]) => ({ channelId, channelName: channelName(channels, channelId), ...v }))
      .sort((a, b) => b.amount - a.amount);
  }
}
