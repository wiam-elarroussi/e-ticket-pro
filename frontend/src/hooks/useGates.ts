'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as gatesApi from '@/api/gates';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useGates(venueId?: string) {
  return useQuery({ queryKey: ['gates', venueId ?? null], queryFn: () => gatesApi.fetchGates(venueId) });
}

export function useCreateGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gatesApi.createGate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success('Porte créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<gatesApi.GatePayload, 'venueId'>> }) =>
      gatesApi.updateGate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success('Porte mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gatesApi.deleteGate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success('Porte supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
