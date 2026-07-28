'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as venuesApi from '@/api/venues';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useVenues() {
  return useQuery({ queryKey: ['venues'], queryFn: venuesApi.fetchVenues });
}

export function useVenue(id: string) {
  return useQuery({ queryKey: ['venues', id], queryFn: () => venuesApi.fetchVenue(id), enabled: !!id });
}

export function useVenueFullTree(id: string) {
  return useQuery({
    queryKey: ['venues', id, 'full'],
    queryFn: () => venuesApi.fetchVenueFullTree(id),
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: venuesApi.createVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Enceinte créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<venuesApi.VenuePayload> }) =>
      venuesApi.updateVenue(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', vars.id] });
      toast.success('Enceinte mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: venuesApi.deleteVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Enceinte supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
