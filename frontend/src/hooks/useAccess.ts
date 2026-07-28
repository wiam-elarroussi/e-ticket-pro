'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as accessApi from '@/api/access';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: accessApi.scan,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['access-logs', vars.eventId] });
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors du scan')),
  });
}

export function useAccessLogs(eventId?: string, gateId?: string) {
  return useQuery({
    queryKey: ['access-logs', eventId ?? null, gateId ?? null],
    queryFn: () => accessApi.fetchLogs(eventId, gateId),
    enabled: !!eventId,
  });
}

export function useSyncPackage(eventId: string | undefined) {
  return useQuery({
    queryKey: ['access-sync-package', eventId],
    queryFn: () => accessApi.fetchSyncPackage(eventId as string),
    enabled: !!eventId,
  });
}
