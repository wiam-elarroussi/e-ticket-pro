'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as accessApi from '@/api/access';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useScan() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: accessApi.scan,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['access-logs', vars.eventId] });
    },
    // Une erreur réseau (backend injoignable, ex: TypeError hors ApiError) n'affiche pas
    // ce toast générique : la page d'accès la traite elle-même (bascule en mode offline).
    onError: (err) => {
      if (err instanceof ApiError) toast.error(errorMessage(err, t('toast.access.scan_error')));
    },
  });
}

export function useAccessLogs(eventId?: string, gateId?: string) {
  return useQuery({
    queryKey: ['access-logs', eventId ?? null, gateId ?? null],
    queryFn: () => accessApi.fetchLogs(eventId, gateId),
    enabled: !!eventId,
    // Fil d'actualité temps réel : voir aussi les scans faits à d'autres portes, pas seulement les siens.
    refetchInterval: 4000,
  });
}

export function useSyncPackage(eventId: string | undefined) {
  return useQuery({
    queryKey: ['access-sync-package', eventId],
    queryFn: () => accessApi.fetchSyncPackage(eventId as string),
    enabled: !!eventId,
  });
}
