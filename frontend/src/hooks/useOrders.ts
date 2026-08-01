'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ordersApi from '@/api/orders';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useOrders(eventId?: string, channelId?: string) {
  return useQuery({
    queryKey: ['orders', eventId ?? null, channelId ?? null],
    queryFn: () => ordersApi.fetchOrders(eventId, channelId),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.fetchOrder(id as string),
    enabled: !!id,
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('toast.order.recorded'));
    },
    // Une erreur réseau (backend injoignable) n'affiche pas ce toast générique :
    // la page POS la traite elle-même (bascule en mode hybride local/cloud).
    onError: (err) => {
      if (err instanceof ApiError) toast.error(errorMessage(err, t('toast.order.sale_error')));
    },
  });
}
