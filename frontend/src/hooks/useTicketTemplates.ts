'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as templatesApi from '@/api/ticket-templates';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useTicketTemplates() {
  return useQuery({ queryKey: ['ticket-templates'], queryFn: templatesApi.fetchTicketTemplates });
}

export function useTicketTemplate(id: string) {
  return useQuery({
    queryKey: ['ticket-templates', id],
    queryFn: () => templatesApi.fetchTicketTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTicketTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.createTicketTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Gabarit créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateTicketTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<templatesApi.TicketTemplatePayload> }) =>
      templatesApi.updateTicketTemplate(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      qc.invalidateQueries({ queryKey: ['ticket-templates', vars.id] });
      toast.success('Gabarit enregistré');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de l’enregistrement')),
  });
}

export function useDeleteTicketTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.deleteTicketTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Gabarit supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
