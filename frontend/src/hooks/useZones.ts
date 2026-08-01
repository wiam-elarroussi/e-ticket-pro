'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as zonesApi from '@/api/zones';
import { ApiError } from '@/lib/api-client';
import { MapPoint } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useZones(standId?: string) {
  return useQuery({ queryKey: ['zones', standId ?? null], queryFn: () => zonesApi.fetchZones(standId) });
}

export function useZone(id: string) {
  return useQuery({ queryKey: ['zones', 'detail', id], queryFn: () => zonesApi.fetchZone(id), enabled: !!id });
}

export function useCreateZone() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: zonesApi.createZone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.zone.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<zonesApi.ZonePayload, 'standId'>> }) =>
      zonesApi.updateZone(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.zone.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useUpdateZonePolygon() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, points }: { id: string; points: MapPoint[] }) => zonesApi.updateZonePolygon(id, points),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.zone.polygon_updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.zone.polygon_update_error'))),
  });
}

export function useSetZoneGateAccess() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, gateIds }: { id: string; gateIds: string[] }) => zonesApi.setZoneGateAccess(id, gateIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.zone.gate_access_updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.zone.gate_access_update_error'))),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: zonesApi.deleteZone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      toast.success(t('toast.zone.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}
