'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as usersApi from '@/api/users';
import { ApiError } from '@/lib/api-client';
import { PermissionEffect } from '@/lib/types';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.fetchUsers,
    // Rafraîchit le statut "en ligne" automatiquement (utile en jour d'événement
    // pour surveiller la connexion des caissiers/contrôleurs en temps quasi réel).
    refetchInterval: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création')),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: usersApi.UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour')),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
  });
}

export function useSetUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionId, effect }: { id: string; permissionId: string; effect: PermissionEffect }) =>
      usersApi.setUserPermission(id, permissionId, effect),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Permission mise à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur')),
  });
}

export function useRemoveUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionId }: { id: string; permissionId: string }) =>
      usersApi.removeUserPermission(id, permissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Override retiré');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur')),
  });
}
