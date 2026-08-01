'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as seatsApi from '@/api/seats';
import { ApiError } from '@/lib/api-client';
import { SeatStatus } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSeats(rowId?: string) {
  return useQuery({
    queryKey: ['seats', rowId ?? null],
    queryFn: () => seatsApi.fetchSeats(rowId),
    enabled: !!rowId,
  });
}

export function useUpdateSeat() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: seatsApi.UpdateSeatPayload }) =>
      seatsApi.updateSeat(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      // Pas de toast ici : appelé à chaque glisser-déposer ou clic de statut
      // dans l'éditeur visuel, un toast par interaction serait envahissant.
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useUpdateSeatStatus() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SeatStatus }) => seatsApi.updateSeatStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useBulkUpdateSeatStatus() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ seatIds, status }: { seatIds: string[]; status: SeatStatus }) =>
      seatsApi.bulkUpdateSeatStatus(seatIds, status),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(`${result.updatedCount} ${t('toast.seat.updated_count')}`);
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.seat.update_bulk_error'))),
  });
}

export function useDeleteSeat() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: seatsApi.deleteSeat,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seats'] });
      qc.invalidateQueries({ queryKey: ['rows'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.seat.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
