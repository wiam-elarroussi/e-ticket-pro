'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { bootstrapAuth } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { useThemeStore } from '@/store/theme-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const lang = useI18nStore((s) => s.lang);
  const hydrateLang = useI18nStore((s) => s.hydrateLang);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    hydrateLang();
    initTheme();
    bootstrapAuth().finally(() => setHydrated());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // PWA (module 8) : condition technique d'installabilité, cf. public/sw.js.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Environnement sans HTTPS/localhost (ou navigateur non compatible) : dégradation silencieuse.
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'EN' ? 'en' : 'fr';
  }, [lang]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
