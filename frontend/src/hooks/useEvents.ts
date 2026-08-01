'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as eventsApi from '@/api/events';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useEvents(venueId?: string) {
  return useQuery({ queryKey: ['events', venueId ?? null], queryFn: () => eventsApi.fetchEvents(venueId) });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: ['events', id], queryFn: () => eventsApi.fetchEvent(id), enabled: !!id });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('toast.event.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<eventsApi.EventPayload> }) =>
      eventsApi.updateEvent(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', vars.id] });
      toast.success(t('toast.event.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('toast.event.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
