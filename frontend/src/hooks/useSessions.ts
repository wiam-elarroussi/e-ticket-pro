'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sessionsApi from '@/api/sessions';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: sessionsApi.revokeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session révoquée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la révocation')),
  });
}

export function useRevokeAllOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revokeAllOtherSessions,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`${result.revokedCount} session(s) révoquée(s)`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la révocation groupée')),
  });
}

export function useRevokeAllSessionsForUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revokeAllSessionsForUser,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`${result.revokedCount} session(s) révoquée(s) pour cet utilisateur`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la révocation groupée')),
  });
}
