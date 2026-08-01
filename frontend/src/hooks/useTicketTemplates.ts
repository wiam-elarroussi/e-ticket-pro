'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as templatesApi from '@/api/ticket-templates';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: templatesApi.createTicketTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success(t('toast.template.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateTicketTemplate() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<templatesApi.TicketTemplatePayload> }) =>
      templatesApi.updateTicketTemplate(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      qc.invalidateQueries({ queryKey: ['ticket-templates', vars.id] });
      toast.success(t('toast.template.saved'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.template.save_error'))),
  });
}

export function useDeleteTicketTemplate() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: templatesApi.deleteTicketTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success(t('toast.template.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
