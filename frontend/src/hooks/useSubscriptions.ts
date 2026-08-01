'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as subscriptionsApi from '@/api/subscriptions';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: subscriptionsApi.createSubscription,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['subscriptions', vars.formulaId] });
      qc.invalidateQueries({ queryKey: ['subscription-formulas'] });
      toast.success(t('toast.subscription.card_created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: subscriptionsApi.UpdateSubscriptionPayload }) =>
      subscriptionsApi.updateSubscription(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(t('toast.subscription.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}
