'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as rowsApi from '@/api/rows';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useRows(zoneId?: string) {
  return useQuery({ queryKey: ['rows', zoneId ?? null], queryFn: () => rowsApi.fetchRows(zoneId) });
}

export function useCreateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rowsApi.createRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      // La zone embarque rows[].seats : sans ça, l'éditeur visuel (SeatCanvas)
      // resterait figé sur l'ancienne liste de rangs après création/suppression.
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Rang créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useDeleteRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rowsApi.deleteRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Rang supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}

export function useGenerateSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, payload }: { rowId: string; payload: rowsApi.GenerateSeatsPayload }) =>
      rowsApi.generateSeats(rowId, payload),
    onSuccess: (seats) => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(`${seats.length} siège(s) généré(s)`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la génération des sièges')),
  });
}
