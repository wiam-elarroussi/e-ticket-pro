'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ticketCategoriesApi from '@/api/ticket-categories';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useTicketCategories() {
  return useQuery({ queryKey: ['ticket-categories'], queryFn: ticketCategoriesApi.fetchTicketCategories });
}

export function useCreateTicketCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketCategoriesApi.createTicketCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Catégorie créée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateTicketCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<ticketCategoriesApi.TicketCategoryPayload, 'code'>> }) =>
      ticketCategoriesApi.updateTicketCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Catégorie mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteTicketCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketCategoriesApi.deleteTicketCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast.success('Catégorie supprimée');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
