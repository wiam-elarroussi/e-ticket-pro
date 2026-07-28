'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ticketsApi from '@/api/tickets';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useTickets(templateId?: string) {
  return useQuery({
    queryKey: ['tickets', templateId ?? null],
    queryFn: () => ticketsApi.fetchTickets(templateId),
    enabled: !!templateId,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'detail', id],
    queryFn: () => ticketsApi.fetchTicket(id as string),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketsApi.createTicket,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tickets', vars.templateId] });
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Billet généré');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la génération')),
  });
}

export function useCodeImage(id: string | undefined, type: 'qrcode' | 'barcode') {
  return useQuery({
    queryKey: ['tickets', id, 'code-image', type],
    queryFn: () => ticketsApi.fetchCodeImage(id as string, type),
    enabled: !!id,
  });
}

export function useReprintTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketsApi.reprintTicket,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets', data.templateId] });
      toast.success('Billet réimprimé (action tracée)');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la réimpression')),
  });
}

export function useCancelTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketsApi.cancelTicket,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets', data.templateId] });
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', data.id] });
      toast.success('Billet annulé (liste noire)');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de l’annulation')),
  });
}
