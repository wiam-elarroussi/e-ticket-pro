'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as eventsApi from '@/api/events';
import { ApiError } from '@/lib/api-client';

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
  return useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Événement créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<eventsApi.EventPayload> }) =>
      eventsApi.updateEvent(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', vars.id] });
      toast.success('Événement mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Événement supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}
