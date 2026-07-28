'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as formulasApi from '@/api/subscription-formulas';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: formulasApi.createSubscriptionFormula,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success('Formule créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateSubscriptionFormula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof formulasApi.updateSubscriptionFormula>[1] }) =>
      formulasApi.updateSubscriptionFormula(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      qc.invalidateQueries({ queryKey: ['subscription-formulas', vars.id] });
      toast.success('Formule mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useSetFormulaIncludedEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eventIds }: { id: string; eventIds: string[] }) =>
      formulasApi.setFormulaIncludedEvents(id, eventIds),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas', vars.id] });
      toast.success('Calendrier de la formule mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour du calendrier')),
  });
}

export function useDeleteSubscriptionFormula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formulasApi.deleteSubscriptionFormula,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success('Formule supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
