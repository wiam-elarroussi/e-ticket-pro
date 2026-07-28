'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as channelsApi from '@/api/sales-channels';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSalesChannels(partnerId?: string) {
  return useQuery({
    queryKey: ['sales-channels', partnerId ?? null],
    queryFn: () => channelsApi.fetchSalesChannels(partnerId),
  });
}

export function useCreateSalesChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: channelsApi.createSalesChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success('Canal de vente créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création du canal')),
  });
}

export function useUpdateSalesChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: channelsApi.UpdateSalesChannelPayload }) =>
      channelsApi.updateSalesChannel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success('Canal de vente mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useSetSalesChannelActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      channelsApi.setSalesChannelActive(id, isActive),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success(vars.isActive ? 'Canal réactivé' : 'Canal désactivé (kill-switch)');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur')),
  });
}
