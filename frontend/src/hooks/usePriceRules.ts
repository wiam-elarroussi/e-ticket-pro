'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as priceRulesApi from '@/api/price-rules';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: priceRulesApi.createPriceRule,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['price-rules', vars.eventId] });
      toast.success('Règle tarifaire créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdatePriceRule() {
  const qc = useQueryClient();
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
      toast.success('Règle tarifaire mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
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
  return useMutation({
    mutationFn: priceRulesApi.deletePriceRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-rules'] });
      toast.success('Règle tarifaire supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
