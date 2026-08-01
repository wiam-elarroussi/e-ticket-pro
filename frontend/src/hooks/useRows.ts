'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as rowsApi from '@/api/rows';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useRows(zoneId?: string) {
  return useQuery({ queryKey: ['rows', zoneId ?? null], queryFn: () => rowsApi.fetchRows(zoneId) });
}

export function useCreateRow() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: rowsApi.createRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      // La zone embarque rows[].seats : sans ça, l'éditeur visuel (SeatCanvas)
      // resterait figé sur l'ancienne liste de rangs après création/suppression.
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.row.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useDeleteRow() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: rowsApi.deleteRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.row.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}

export function useGenerateSeats() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ rowId, payload }: { rowId: string; payload: rowsApi.GenerateSeatsPayload }) =>
      rowsApi.generateSeats(rowId, payload),
    onSuccess: (seats) => {
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(`${seats.length} ${t('toast.row.seats_generated')}`);
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.row.seats_generate_error'))),
  });
}
