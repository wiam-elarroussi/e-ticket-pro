'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as venuesApi from '@/api/venues';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: venuesApi.createVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      toast.success(t('toast.venue.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<venuesApi.VenuePayload> }) =>
      venuesApi.updateVenue(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', vars.id] });
      toast.success(t('toast.venue.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: venuesApi.deleteVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      toast.success(t('toast.venue.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
