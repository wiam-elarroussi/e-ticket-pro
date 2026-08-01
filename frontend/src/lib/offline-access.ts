import { SyncPackage, ScanResult } from './access-types';

/**
 * Mode offline/edge (module 6, lettre de conformité §3 "Continuité de
 * Service") : le poste de contrôle met en cache localement la liste
 * blanche/noire d'un événement (déjà exposée par access-service via
 * /access/sync-package, jamais consommée jusqu'ici) et peut valider des
 * billets sans le réseau. Les scans faits hors-ligne sont mis en file
 * d'attente et rejoués contre le vrai backend dès la reconnexion — aucune
 * donnée n'est fabriquée, seule la disponibilité momentanée du réseau change.
 */

const SYNC_PACKAGE_KEY = (eventId: string) => `eticketpro.offline.sync.${eventId}`;
const QUEUE_KEY = 'eticketpro.offline.queue';
const SCANNED_KEY = (eventId: string) => `eticketpro.offline.scanned.${eventId}`;

export interface OfflineScanEntry {
  localId: string;
  eventId: string;
  gateId: string;
  code?: string;
  nfcTagId?: string;
  subscriptionId?: string;
  scannedLocallyAt: string;
}

export function saveSyncPackage(pkg: SyncPackage) {
  try {
    localStorage.setItem(SYNC_PACKAGE_KEY(pkg.eventId), JSON.stringify(pkg));
  } catch {
    // Stockage plein/indisponible : dégradation acceptable, le mode offline sera juste indisponible.
  }
}

export function loadSyncPackage(eventId: string): SyncPackage | null {
  try {
    const raw = localStorage.getItem(SYNC_PACKAGE_KEY(eventId));
    return raw ? (JSON.parse(raw) as SyncPackage) : null;
  } catch {
    return null;
  }
}

export function getOfflineQueue(): OfflineScanEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineScanEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushOfflineQueue(entry: OfflineScanEntry) {
  const queue = getOfflineQueue();
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(localId: string) {
  const queue = getOfflineQueue().filter((e) => e.localId !== localId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Anti-double-scan hors-ligne, best-effort (session locale uniquement — pas de
 * coordination entre plusieurs postes hors-ligne sur le même événement). */
function getOfflineScannedCodes(eventId: string): string[] {
  try {
    const raw = localStorage.getItem(SCANNED_KEY(eventId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markOfflineScanned(eventId: string, key: string) {
  const scanned = getOfflineScannedCodes(eventId);
  scanned.push(key);
  localStorage.setItem(SCANNED_KEY(eventId), JSON.stringify(scanned));
}

export interface OfflineValidationResult {
  granted: boolean;
  result: ScanResult;
  reason: string | null;
}

/** Validation locale contre la liste blanche/noire mise en cache — même logique
 * de résultat que le serveur (VALID/CANCELLED/ALREADY_SCANNED/INVALID), sans
 * checksum (déjà vérifié côté serveur au moment de la mise en cache) ni
 * contrôle de zone/porte (nécessite venue-service, indisponible hors-ligne). */
export function validateOffline(eventId: string, input: { code?: string; nfcTagId?: string }): OfflineValidationResult {
  const pkg = loadSyncPackage(eventId);
  if (!pkg) {
    return { granted: false, result: 'INVALID', reason: 'Aucun cache hors-ligne disponible pour cet événement' };
  }

  const key = input.code ?? input.nfcTagId ?? '';
  const matchWhitelist = input.code
    ? pkg.whitelist.find((t) => t.code === input.code)
    : pkg.whitelist.find((t) => t.nfcTagId === input.nfcTagId);
  const matchBlacklist = input.code
    ? pkg.blacklist.find((t) => t.code === input.code)
    : pkg.blacklist.find((t) => t.nfcTagId === input.nfcTagId);

  if (matchBlacklist) {
    return { granted: false, result: 'CANCELLED', reason: 'Billet annulé (liste noire hors-ligne)' };
  }
  if (!matchWhitelist) {
    return { granted: false, result: 'INVALID', reason: 'Billet introuvable dans le cache hors-ligne' };
  }
  if (getOfflineScannedCodes(eventId).includes(key)) {
    return { granted: false, result: 'ALREADY_SCANNED', reason: 'Déjà scanné hors-ligne à ce poste' };
  }
  markOfflineScanned(eventId, key);
  return { granted: true, result: 'VALID', reason: null };
}
