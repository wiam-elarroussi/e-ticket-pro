import { PriceRule, TicketCategory } from './pricing-types';
import { VenueFullTree } from './venue-types';
import { CheckoutPayload } from '@/api/orders';

/**
 * Mode hybride local/cloud du guichet POS (module 5, "Continuité de Service"
 * — même principe que le mode offline déjà bâti pour le contrôle d'accès,
 * module 6). Le poste met en cache le catalogue de l'événement sélectionné
 * (plan de salle, catégories, grille tarifaire) dès qu'il est chargé, et peut
 * continuer à encaisser des ventes si le réseau tombe. Limite assumée et
 * honnête : deux postes hors-ligne peuvent vendre le même siège en parallèle
 * (aucune coordination possible sans réseau) — la réconciliation se fait à la
 * synchronisation, où le serveur redevient la seule source de vérité.
 */

interface CatalogSnapshot {
  eventId: string;
  venue: VenueFullTree;
  categories: TicketCategory[];
  priceRules: PriceRule[];
  savedAt: string;
}

export interface OfflineSale {
  localId: string;
  payload: CheckoutPayload;
  soldLocallyAt: string;
}

const CATALOG_KEY = (eventId: string) => `eticketpro.pos.offline.catalog.${eventId}`;
const QUEUE_KEY = 'eticketpro.pos.offline.queue';
const LOCAL_SOLD_KEY = (eventId: string) => `eticketpro.pos.offline.sold.${eventId}`;

export function saveCatalogSnapshot(snapshot: Omit<CatalogSnapshot, 'savedAt'>) {
  try {
    const full: CatalogSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
    localStorage.setItem(CATALOG_KEY(snapshot.eventId), JSON.stringify(full));
  } catch {
    // Stockage indisponible/plein : dégradation acceptable, le mode hybride sera juste indisponible.
  }
}

export function loadCatalogSnapshot(eventId: string): CatalogSnapshot | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY(eventId));
    return raw ? (JSON.parse(raw) as CatalogSnapshot) : null;
  } catch {
    return null;
  }
}

export function getOfflineQueue(): OfflineSale[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineSale[]) : [];
  } catch {
    return [];
  }
}

export function pushOfflineQueue(sale: OfflineSale) {
  const queue = getOfflineQueue();
  queue.push(sale);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(localId: string) {
  const queue = getOfflineQueue().filter((s) => s.localId !== localId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Sièges vendus hors-ligne à ce poste, en attendant la synchro — pour ne pas
 * les proposer de nouveau tant qu'ils n'ont pas été confirmés par le serveur. */
export function getLocallySoldSeats(eventId: string): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_SOLD_KEY(eventId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markSeatsSoldLocally(eventId: string, seatIds: string[]) {
  const current = getLocallySoldSeats(eventId);
  localStorage.setItem(LOCAL_SOLD_KEY(eventId), JSON.stringify([...current, ...seatIds]));
}

export function clearLocallySoldSeats(eventId: string) {
  localStorage.removeItem(LOCAL_SOLD_KEY(eventId));
}

/**
 * Reproduit la résolution tarifaire serveur (SEAT > ZONE > STAND > EVENT,
 * fenêtre de validité active) sur le snapshot mis en cache — cf.
 * price-rules.service.ts#resolvePrice côté events-service.
 */
export function resolveOfflinePrice(
  priceRules: PriceRule[],
  query: { categoryId: string; standId?: string; zoneId?: string; seatId?: string },
): PriceRule | null {
  const now = new Date();
  const levels: Array<{ scope: PriceRule['scope']; matches: (r: PriceRule) => boolean }> = [];
  if (query.seatId) levels.push({ scope: 'SEAT', matches: (r) => r.seatId === query.seatId });
  if (query.zoneId) levels.push({ scope: 'ZONE', matches: (r) => r.zoneId === query.zoneId });
  if (query.standId) levels.push({ scope: 'STAND', matches: (r) => r.standId === query.standId });
  levels.push({ scope: 'EVENT', matches: () => true });

  for (const level of levels) {
    const candidates = priceRules.filter(
      (r) => r.categoryId === query.categoryId && r.scope === level.scope && level.matches(r),
    );
    const active = candidates.filter(
      (r) => (!r.validFrom || new Date(r.validFrom) <= now) && (!r.validTo || new Date(r.validTo) >= now),
    );
    if (active.length > 0) {
      return active.find((r) => r.validFrom || r.validTo) ?? active[0];
    }
  }
  return null;
}
