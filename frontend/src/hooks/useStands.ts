'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as standsApi from '@/api/stands';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: standsApi.createStand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success('Tribune créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateStand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<standsApi.StandPayload, 'venueId'>> }) =>
      standsApi.updateStand(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success('Tribune mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteStand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: standsApi.deleteStand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stands'] });
      toast.success('Tribune supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
