export type ScanType = 'TICKET' | 'SUBSCRIPTION';
export type ScanResult = 'VALID' | 'ALREADY_SCANNED' | 'INVALID' | 'CANCELLED' | 'WRONG_EVENT' | 'OVERRIDDEN';

export interface AccessLog {
  id: string;
  eventId: string;
  gateId: string;
  scanType: ScanType;
  ticketId: string | null;
  subscriptionId: string | null;
  rawCode: string | null;
  result: ScanResult;
  reason: string | null;
  scannedById: string;
  scannedAt: string;
  latencyMs: number | null;
}

export interface ScanResponse {
  granted: boolean;
  result: ScanResult;
  reason: string | null;
  ticket?: { id: string; eventId: string | null; status: string; dataSnapshot: Record<string, unknown> } | null;
  seatId?: string | null;
  log: AccessLog;
}

export interface SyncPackage {
  eventId: string;
  generatedAt: string;
  whitelist: Array<{ id: string; code: string; checksum: string; nfcTagId: string | null }>;
  blacklist: Array<{ id: string; code: string; nfcTagId: string | null }>;
}
