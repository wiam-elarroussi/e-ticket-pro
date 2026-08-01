'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as quotasApi from '@/api/partner-quotas';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function usePartnerQuotas(partnerId?: string) {
  return useQuery({
    queryKey: ['partner-quotas', partnerId ?? null],
    queryFn: () => quotasApi.fetchPartnerQuotas(partnerId),
  });
}

export function useCreatePartnerQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: quotasApi.createPartnerQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success(t('toast.partnerQuota.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.partnerQuota.create_error'))),
  });
}

export function useUpdatePartnerQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: quotasApi.UpdatePartnerQuotaPayload }) =>
      quotasApi.updatePartnerQuota(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success(t('toast.partnerQuota.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeletePartnerQuota() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: quotasApi.deletePartnerQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success(t('toast.partnerQuota.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
