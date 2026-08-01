'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as standsApi from '@/api/stands';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useStands(venueId?: string) {
  return useQuery({ queryKey: ['stands', venueId ?? null], queryFn: () => standsApi.fetchStands(venueId) });
}

export function useStand(id: string) {
  return useQuery({ queryKey: ['stands', 'detail', id], queryFn: () => standsApi.fetchStand(id), enabled: !!id });
}

export function useCreateStand() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: standsApi.createStand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success(t('toast.stand.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateStand() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<standsApi.StandPayload, 'venueId'>> }) =>
      standsApi.updateStand(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success(t('toast.stand.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteStand() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: standsApi.deleteStand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success(t('toast.stand.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
