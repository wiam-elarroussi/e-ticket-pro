'use client';

import { usePathname } from 'next/navigation';
import { useI18nStore } from '@/store/i18n-store';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useI18nStore((s) => s.t);

  // La page de connexion gère son propre habillage plein écran (deux volets) ;
  // les autres pages (mot de passe oublié/réinitialisation) gardent la carte centrée classique.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">E-Ticket Pro</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('auth.admin_console')}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">{children}</div>
      </div>
    </div>
  );
}
