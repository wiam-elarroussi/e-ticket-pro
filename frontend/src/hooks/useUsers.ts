'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as usersApi from '@/api/users';
import { ApiError } from '@/lib/api-client';
import { PermissionEffect } from '@/lib/types';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.user.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.create_error'))),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: usersApi.UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.user.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.update_error'))),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.user.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.delete_error'))),
  });
}

export function useSetUserPermission() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, permissionId, effect }: { id: string; permissionId: string; effect: PermissionEffect }) =>
      usersApi.setUserPermission(id, permissionId, effect),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.user.permission_updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}

export function useRemoveUserPermission() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, permissionId }: { id: string; permissionId: string }) =>
      usersApi.removeUserPermission(id, permissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.user.override_removed'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.generic.error'))),
  });
}
