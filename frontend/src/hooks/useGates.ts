'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as gatesApi from '@/api/gates';
import { ApiError } from '@/lib/api-client';
import { GateDeviceStatus } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useGates(venueId?: string) {
  return useQuery({
    queryKey: ['gates', venueId ?? null],
    queryFn: () => gatesApi.fetchGates(venueId),
    // Monitoring des portes (module 6) : statut effectif recalculé côté serveur
    // à chaque lecture, donc un simple polling suffit à refléter les pannes/silences.
    refetchInterval: 10000,
  });
}

/** Envoyé par le poste de scan à chaque scan réel — preuve de vie du matériel. */
export function useGateHeartbeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gateId, status }: { gateId: string; status: GateDeviceStatus }) =>
      gatesApi.sendGateHeartbeat(gateId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gates'] }),
  });
}

export function useCreateGate() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: gatesApi.createGate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success(t('toast.gate.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateGate() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<gatesApi.GatePayload, 'venueId'>> }) =>
      gatesApi.updateGate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success(t('toast.gate.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteGate() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: gatesApi.deleteGate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gates'] });
      toast.success(t('toast.gate.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
