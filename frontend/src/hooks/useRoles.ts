'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as rolesApi from '@/api/roles';
import { ApiError } from '@/lib/api-client';
import { useI18nStore } from '@/store/i18n-store';

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
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('toast.role.created'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.role.create_error'))),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: rolesApi.UpdateRolePayload }) =>
      rolesApi.updateRole(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('toast.role.updated'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.role.update_error'))),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const t = useI18nStore((s) => s.t);
  return useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('toast.role.deleted'));
    },
    onError: (err) => toast.error(errorMessage(err, t('toast.role.delete_error'))),
  });
}
