'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as formulasApi from '@/api/subscription-formulas';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSubscriptionFormulas(venueId?: string) {
  return useQuery({
    queryKey: ['subscription-formulas', venueId ?? null],
    queryFn: () => formulasApi.fetchSubscriptionFormulas(venueId),
  });
}

export function useSubscriptionFormula(id: string) {
  return useQuery({
    queryKey: ['subscription-formulas', id],
    queryFn: () => formulasApi.fetchSubscriptionFormula(id),
    enabled: !!id,
  });
}

export function useCreateSubscriptionFormula() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: formulasApi.createSubscriptionFormula,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success(t('toast.subscriptionFormula.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateSubscriptionFormula() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof formulasApi.updateSubscriptionFormula>[1] }) =>
      formulasApi.updateSubscriptionFormula(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      qc.invalidateQueries({ queryKey: ['subscription-formulas', vars.id] });
      toast.success(t('toast.subscriptionFormula.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useSetFormulaIncludedEvents() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, eventIds }: { id: string; eventIds: string[] }) =>
      formulasApi.setFormulaIncludedEvents(id, eventIds),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas', vars.id] });
      toast.success(t('toast.subscriptionFormula.calendar_updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.subscriptionFormula.calendar_update_error'))),
  });
}

export function useDeleteSubscriptionFormula() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: formulasApi.deleteSubscriptionFormula,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success(t('toast.subscriptionFormula.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
