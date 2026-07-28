import { apiFetch } from '@/lib/api-client';
import { SessionInfo } from '@/lib/types';

export function fetchMySessions() {
  return apiFetch<SessionInfo[]>('/sessions/me');
}

export function fetchAllSessions(userId?: string) {
  const qs = userId ? `?userId=${userId}` : '';
  return apiFetch<SessionInfo[]>(`/sessions${qs}`);
}

export function revokeSession(id: string) {
  return apiFetch<unknown>(`/sessions/${id}`, { method: 'DELETE' });
}

export function revokeAllOtherSessions() {
  return apiFetch<{ revokedCount: number }>('/sessions/mine/others', { method: 'DELETE' });
}

export function revokeAllSessionsForUser(userId: string) {
  return apiFetch<{ revokedCount: number }>(`/sessions/by-user/${userId}`, { method: 'DELETE' });
}
