'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as quotasApi from '@/api/partner-quotas';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: quotasApi.createPartnerQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success('Quota créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création du quota')),
  });
}

export function useUpdatePartnerQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: quotasApi.UpdatePartnerQuotaPayload }) =>
      quotasApi.updatePartnerQuota(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success('Quota mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeletePartnerQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: quotasApi.deletePartnerQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-quotas'] });
      toast.success('Quota supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
