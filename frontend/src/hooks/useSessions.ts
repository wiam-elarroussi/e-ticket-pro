'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sessionsApi from '@/api/sessions';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useMySessions() {
  return useQuery({ queryKey: ['sessions', 'me'], queryFn: sessionsApi.fetchMySessions });
}

export function useAllSessions(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'all', userId ?? null],
    queryFn: () => sessionsApi.fetchAllSessions(userId),
    enabled,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: sessionsApi.revokeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('toast.session.revoked'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.session.revoke_error'))),
  });
}

export function useRevokeAllOtherSessions() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: sessionsApi.revokeAllOtherSessions,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`${result.revokedCount} ${t('toast.session.revoked_count')}`);
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.session.revoke_bulk_error'))),
  });
}

export function useRevokeAllSessionsForUser() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: sessionsApi.revokeAllSessionsForUser,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`${result.revokedCount} ${t('toast.session.revoked_count_for_user')}`);
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.session.revoke_bulk_error'))),
  });
}
