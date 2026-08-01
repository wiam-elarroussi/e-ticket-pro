'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as priceRulesApi from '@/api/price-rules';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function usePriceRules(eventId?: string) {
  return useQuery({
    queryKey: ['price-rules', eventId ?? null],
    queryFn: () => priceRulesApi.fetchPriceRules(eventId),
    enabled: !!eventId,
  });
}

export function useCreatePriceRule() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: priceRulesApi.createPriceRule,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['price-rules', vars.eventId] });
      toast.success(t('toast.priceRule.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdatePriceRule() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<priceRulesApi.PriceRulePayload, 'price' | 'validFrom' | 'validTo'>>;
    }) => priceRulesApi.updatePriceRule(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success(t('toast.priceRule.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useResolvePrice(query: priceRulesApi.ResolvePriceQuery | null) {
  return useQuery({
    queryKey: ['price-rules', 'resolve', query],
    queryFn: () => priceRulesApi.resolvePrice(query as priceRulesApi.ResolvePriceQuery),
    enabled: !!query,
    retry: false,
  });
}

export function useDeletePriceRule() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: priceRulesApi.deletePriceRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success(t('toast.priceRule.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
