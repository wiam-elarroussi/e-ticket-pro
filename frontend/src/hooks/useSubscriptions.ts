'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as subscriptionsApi from '@/api/subscriptions';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSubscriptions(formulaId?: string) {
  return useQuery({
    queryKey: ['subscriptions', formulaId ?? null],
    queryFn: () => subscriptionsApi.fetchSubscriptions(formulaId),
    enabled: !!formulaId,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsApi.createSubscription,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscriptions', vars.formulaId] });
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success('Carte abonné créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: subscriptionsApi.UpdateSubscriptionPayload }) =>
      subscriptionsApi.updateSubscription(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Abonnement mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}
