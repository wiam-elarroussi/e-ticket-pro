'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as partnersApi from '@/api/partners';
import { ApiError } from '@/lib/api-client';
import { PartnerStatus } from '@/lib/types';
import { useI18nStore } from '@/store/i18n-store';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function usePartners() {
  return useQuery({ queryKey: ['partners'], queryFn: partnersApi.fetchPartners });
}

export function usePartner(id: string) {
  return useQuery({ queryKey: ['partners', id], queryFn: () => partnersApi.fetchPartner(id), enabled: !!id });
}

export function useArchivedPartners() {
  return useQuery({ queryKey: ['partners', 'archived'], queryFn: partnersApi.fetchArchivedPartners });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: partnersApi.createPartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('toast.partner.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<partnersApi.PartnerPayload> }) =>
      partnersApi.updatePartner(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', vars.id] });
      toast.success(t('toast.partner.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useSetPartnerStatus() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PartnerStatus }) => partnersApi.setPartnerStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', vars.id] });
      toast.success(vars.status === 'SUSPENDED' ? t('toast.partner.suspended') : t('toast.partner.reactivated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}

/** Archivage (soft delete) : masque le partenaire, désactive ses canaux de vente. */
export function useArchivePartner() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: partnersApi.archivePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('toast.partner.archived'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.partner.archive_error'))),
  });
}

export function useRestorePartner() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: partnersApi.restorePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('toast.partner.restored'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.partner.restore_error'))),
  });
}

/** Portail partenaire (module 4) : émet une nouvelle clé API pour ce partenaire. */
export function useGeneratePartnerApiKey() {
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: partnersApi.generatePartnerApiKey,
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}

/** Suppression définitive : le backend bloque avec un message explicite s'il reste un historique. */
export function useHardDeletePartner() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: partnersApi.hardDeletePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('toast.partner.deleted_permanently'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.partner.delete_permanently_error'))),
  });
}
