import { apiFetch } from '@/lib/api-client';
import { Permission, Role } from '@/lib/types';

export function fetchRoles() {
  return apiFetch<Role[]>('/roles');
}

export function fetchPermissionsCatalog() {
  return apiFetch<Permission[]>('/roles/permissions/catalog');
}

export interface CreateRolePayload {
  code: string;
  label: string;
  permissionIds: string[];
}

export function createRole(payload: CreateRolePayload) {
  return apiFetch<Role>('/roles', { method: 'POST', json: payload });
}

export interface UpdateRolePayload {
  label?: string;
  permissionIds?: string[];
}

export function updateRole(id: string, payload: UpdateRolePayload) {
  return apiFetch<Role>(`/roles/${id}`, { method: 'PATCH', json: payload });
}

export function deleteRole(id: string) {
  return apiFetch<{ success: boolean }>(`/roles/${id}`, { method: 'DELETE' });
}
