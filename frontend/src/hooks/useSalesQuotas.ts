'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as salesQuotasApi from '@/api/sales-quotas';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: salesQuotasApi.createSalesQuota,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-quotas', vars.eventId] });
      toast.success('Jauge créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateSalesQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, maxQuantity }: { id: string; maxQuantity: number | undefined }) =>
      salesQuotasApi.updateSalesQuota(id, maxQuantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success('Jauge mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useSetSalesQuotaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      salesQuotasApi.setSalesQuotaStatus(id, isBlocked),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success(vars.isBlocked ? 'Vente bloquée' : 'Vente débloquée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur')),
  });
}

export function useDeleteSalesQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesQuotasApi.deleteSalesQuota,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-quotas'] });
      toast.success('Jauge supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
