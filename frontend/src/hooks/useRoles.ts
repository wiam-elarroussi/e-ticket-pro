'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as rolesApi from '@/api/roles';
import { ApiError } from '@/lib/api-client';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: rolesApi.fetchRoles });
}

export function usePermissionsCatalog() {
  return useQuery({ queryKey: ['permissions-catalog'], queryFn: rolesApi.fetchPermissionsCatalog });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle créé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la création du rôle')),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: rolesApi.UpdateRolePayload }) =>
      rolesApi.updateRole(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rôle mis à jour');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la mise à jour du rôle')),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle supprimé');
    },
    onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression du rôle')),
  });
}
