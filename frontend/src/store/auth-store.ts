'use client';

import { create } from 'zustand';
import { decodeAccessToken, DecodedAccessToken } from '@/lib/jwt';

const REFRESH_TOKEN_KEY = 'eticketpro.refreshToken';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: DecodedAccessToken | null;
  hydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
  hasPermission: (perm: string) => boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null,
  user: null,
  hydrated: false,
  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    set({ accessToken, refreshToken, user: decodeAccessToken(accessToken) });
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hasPermission: (perm) => get().user?.perms.includes(perm) ?? false,
  setHydrated: () => set({ hydrated: true }),
}));
