'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as partnersApi from '@/api/partners';
import { ApiError } from '@/lib/api-client';
import { PartnerStatus } from '@/lib/types';

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
  return useMutation({
    mutationFn: partnersApi.createPartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partenaire créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<partnersApi.PartnerPayload> }) =>
      partnersApi.updatePartner(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', vars.id] });
      toast.success('Partenaire mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useSetPartnerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PartnerStatus }) => partnersApi.setPartnerStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', vars.id] });
      toast.success(vars.status === 'SUSPENDED' ? 'Partenaire suspendu' : 'Partenaire réactivé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur')),
  });
}

/** Archivage (soft delete) : masque le partenaire, désactive ses canaux de vente. */
export function useArchivePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnersApi.archivePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partenaire archivé — canaux de vente désactivés');
    },
    onError: (err) => toast.error(errorMessage(err, "Erreur lors de l'archivage")),
  });
}

export function useRestorePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnersApi.restorePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partenaire restauré dans la liste active');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la restauration')),
  });
}

/** Suppression définitive : le backend bloque avec un message explicite s'il reste un historique. */
export function useHardDeletePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnersApi.hardDeletePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partenaire supprimé définitivement');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression définitive')),
  });
}
