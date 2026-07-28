'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ordersApi from '@/api/orders';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Vente enregistrée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la vente')),
  });
}
