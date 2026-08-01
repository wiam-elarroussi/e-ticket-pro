'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as channelsApi from '@/api/sales-channels';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: channelsApi.createSalesChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success(t('toast.salesChannel.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.salesChannel.create_error'))),
  });
}

export function useUpdateSalesChannel() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: channelsApi.UpdateSalesChannelPayload }) =>
      channelsApi.updateSalesChannel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success(t('toast.salesChannel.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useSetSalesChannelActive() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      channelsApi.setSalesChannelActive(id, isActive),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success(vars.isActive ? t('toast.salesChannel.reactivated') : t('toast.salesChannel.deactivated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}
