'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as reportsApi from '@/api/reports';
import { ApiError } from '@/lib/api-client';
import { ExportFormat } from '@/lib/report-types';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

/** 7.1 — pas de WebSocket dans ce premier jet : le "live" est obtenu par re-fetch périodique. */
export function useEventDashboard(eventId: string) {
  return useQuery({
    queryKey: ['reports', 'dashboard', eventId],
    queryFn: () => reportsApi.fetchDashboard(eventId),
    enabled: !!eventId,
    refetchInterval: 15000,
  });
}

export function useCompareEvents(eventIds: string[]) {
  return useQuery({
    queryKey: ['reports', 'compare', ...eventIds],
    queryFn: () => reportsApi.fetchCompareEvents(eventIds),
    enabled: eventIds.length > 0,
  });
}

export function useChannelBreakdown(eventId?: string) {
  return useQuery({
    queryKey: ['reports', 'channels', eventId ?? null],
    queryFn: () => reportsApi.fetchChannelBreakdown(eventId),
  });
}

export function useDownloadOrdersExport() {
  return useMutation({
    mutationFn: ({ format, eventId }: { format: ExportFormat; eventId?: string }) =>
      reportsApi.downloadOrdersExport(format, eventId),
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de l’export')),
  });
}

export function useDownloadAccessLogsExport() {
  return useMutation({
    mutationFn: ({ eventId, format }: { eventId: string; format: ExportFormat }) =>
      reportsApi.downloadAccessLogsExport(eventId, format),
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de l’export')),
  });
}

export function useDownloadCrmExport() {
  return useMutation({
    mutationFn: ({ format, eventId }: { format: 'csv' | 'xlsx'; eventId?: string }) =>
      reportsApi.downloadCrmExport(format, eventId),
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de l’export')),
  });
}
