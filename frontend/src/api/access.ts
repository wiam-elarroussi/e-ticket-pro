import { apiFetch, ACCESS_API_URL } from '@/lib/api-client';
import { AccessLog, ScanResponse, SyncPackage } from '@/lib/access-types';

export interface ScanPayload {
  eventId: string;
  gateId: string;
  code?: string;
  subscriptionId?: string;
  force?: boolean;
}

export function scan(payload: ScanPayload) {
  return apiFetch<ScanResponse>('/access/scan', { method: 'POST', json: payload, baseUrl: ACCESS_API_URL });
}

export function fetchLogs(eventId?: string, gateId?: string) {
  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (gateId) params.set('gateId', gateId);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch<AccessLog[]>(`/access/logs${qs}`, { baseUrl: ACCESS_API_URL });
}

export function fetchSyncPackage(eventId: string) {
  return apiFetch<SyncPackage>(`/access/sync-package?eventId=${eventId}`, { baseUrl: ACCESS_API_URL });
}
