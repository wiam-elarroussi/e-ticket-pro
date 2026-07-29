import { useAuthStore } from '@/store/auth-store';

const AUTH_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const VENUE_API_URL = process.env.NEXT_PUBLIC_VENUE_API_URL ?? 'http://localhost:3003';
export const EVENTS_API_URL = process.env.NEXT_PUBLIC_EVENTS_API_URL ?? 'http://localhost:3004';
export const TICKETS_API_URL = process.env.NEXT_PUBLIC_TICKETS_API_URL ?? 'http://localhost:3005';
export const POS_API_URL = process.env.NEXT_PUBLIC_POS_API_URL ?? 'http://localhost:3006';
export const ACCESS_API_URL = process.env.NEXT_PUBLIC_ACCESS_API_URL ?? 'http://localhost:3007';
export const REPORTS_API_URL = process.env.NEXT_PUBLIC_REPORTS_API_URL ?? 'http://localhost:3008';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  const res = await fetch(`${AUTH_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    useAuthStore.getState().clear();
    return null;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

/** Un seul refresh en vol à la fois, même si plusieurs requêtes 401 arrivent en même temps. */
function refreshTokens(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Tentative de restauration de session au chargement de l'app, à partir du refresh token persisté. */
export async function bootstrapAuth(): Promise<void> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (accessToken || !refreshToken) return;
  await refreshTokens();
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  skipAuth?: boolean;
  json?: unknown;
  /** Microservice ciblé — auth-service par défaut, passer VENUE_API_URL pour venue-service. */
  baseUrl?: string;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth, json, headers, baseUrl = AUTH_API_URL, ...rest } = options;

  const buildHeaders = (): Record<string, string> => {
    const { accessToken } = useAuthStore.getState();
    return {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers as Record<string, string> | undefined),
      ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: buildHeaders(),
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });

  let response = await doFetch();

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshTokens();
    if (newToken) {
      response = await doFetch();
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    const message: string = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message as string | undefined) ?? response.statusText;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

/** Télécharge un fichier (export CSV/XLSX/PDF/XML) protégé par le Bearer token, et déclenche le
 * téléchargement navigateur — un simple <a href> ne peut pas porter l'en-tête Authorization. */
export async function downloadFile(path: string, baseUrl: string): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  let response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (response.status === 401) {
    const newToken = await refreshTokens();
    if (newToken) {
      response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${newToken}` } });
    }
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? message);
    } catch {
      // corps non-JSON, on garde le statusText
    }
    throw new ApiError(response.status, message);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? 'export';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
