import { apiFetch } from '@/lib/api-client';
import { PermissionEffect, User } from '@/lib/types';

export function fetchUsers() {
  return apiFetch<User[]>('/users');
}

export function fetchUser(id: string) {
  return apiFetch<User>(`/users/${id}`);
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleId: string;
}

export function createUser(payload: CreateUserPayload) {
  return apiFetch<User>('/users', { method: 'POST', json: payload });
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  fullName?: string;
  roleId?: string;
  isActive?: boolean;
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiFetch<User>(`/users/${id}`, { method: 'PATCH', json: payload });
}

export function deleteUser(id: string) {
  return apiFetch<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });
}

export function setUserPermission(id: string, permissionId: string, effect: PermissionEffect) {
  return apiFetch(`/users/${id}/permissions`, { method: 'POST', json: { permissionId, effect } });
}

export function removeUserPermission(id: string, permissionId: string) {
  return apiFetch(`/users/${id}/permissions/${permissionId}`, { method: 'DELETE' });
}
