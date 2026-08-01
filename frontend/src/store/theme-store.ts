'use client';

import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'eticketpro.theme';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

// Le script bloquant dans app/layout.tsx applique déjà la classe `dark` sur
// <html> avant l'hydratation (anti-FOUC) — initTheme() ne fait que synchroniser
// l'état réactif du store avec ce choix déjà appliqué au DOM.
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) || 'light';
    set({ theme: saved });
  },

  setTheme: (theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const { theme, setTheme } = get();
    setTheme(theme === 'light' ? 'dark' : 'light');
  },
}));
