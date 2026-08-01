'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as salesQuotasApi from '@/api/sales-quotas';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSalesQuotas(eventId?: string) {
  return useQuery({
    queryKey: ['sales-quotas', eventId ?? null],
    queryFn: () => salesQuotasApi.fetchSalesQuotas(eventId),
    enabled: !!eventId,
  });
}

export function useCreateSalesQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: salesQuotasApi.createSalesQuota,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-quotas', vars.eventId] });
      toast.success(t('toast.salesQuota.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateSalesQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, maxQuantity }: { id: string; maxQuantity: number | undefined }) =>
      salesQuotasApi.updateSalesQuota(id, maxQuantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success(t('toast.salesQuota.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useSetSalesQuotaStatus() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      salesQuotasApi.setSalesQuotaStatus(id, isBlocked),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success(vars.isBlocked ? t('toast.salesQuota.sales_blocked') : t('toast.salesQuota.sales_unblocked'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}

export function useDeleteSalesQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: salesQuotasApi.deleteSalesQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success(t('toast.salesQuota.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
