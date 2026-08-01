'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ticketCategoriesApi from '@/api/ticket-categories';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useTicketCategories() {
  return useQuery({ queryKey: ['ticket-categories'], queryFn: ticketCategoriesApi.fetchTicketCategories });
}

export function useCreateTicketCategory() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ticketCategoriesApi.createTicketCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success(t('toast.ticketCategory.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateTicketCategory() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<ticketCategoriesApi.TicketCategoryPayload, 'code'>> }) =>
      ticketCategoriesApi.updateTicketCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success(t('toast.ticketCategory.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteTicketCategory() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ticketCategoriesApi.deleteTicketCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success(t('toast.ticketCategory.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
