import { apiFetch } from '@/lib/api-client';
import { User } from '@/lib/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

export function login(username: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { username, password },
    skipAuth: true,
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>('/auth/password-reset/request', {
    method: 'POST',
    json: { email },
    skipAuth: true,
  });
}

export function confirmPasswordReset(token: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/password-reset/confirm', {
    method: 'POST',
    json: { token, newPassword },
    skipAuth: true,
  });
}

export function logout() {
  return apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
}

export function fetchMe() {
  return apiFetch<User>('/users/me');
}
