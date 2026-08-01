'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { useThemeStore } from '@/store/theme-store';
import { logout as logoutRequest } from '@/api/auth';
import { navItems } from '@/lib/nav';
import { translateRoleLabel } from '@/lib/roles';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const clear = useAuthStore((s) => s.clear);
  const { lang, setLang, t } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDarkMode = theme === 'dark';

  const currentItem = navItems.find((item) => item.href === pathname);
  const currentLabel =
    pathname === '/dashboard'
      ? t('nav.dashboard')
      : currentItem
      ? t(currentItem.translationKey)
      : t('nav.dashboard');

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignoré
    } finally {
      clear();
      queryClient.clear();
      toast.success(t('toast.auth.logged_out'));
      router.replace('/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl px-6 sm:px-8 transition-colors">
      {/* Bouton Menu Mobile & Titre */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 md:hidden"
          aria-label={t('layout.open_menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {currentLabel}
          </h1>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 hidden sm:block">
            {t('topbar.tagline')}
          </p>
        </div>
      </div>

      {/* Actions Droite : Badge Live, Dark Mode, FR/EN, Avatar Utilisateur */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Badge Live */}
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {t('topbar.live')}
          </span>
        </div>

        {/* Toggle Dark / Light Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-800"
          title={isDarkMode ? 'Mode Clair' : 'Mode Sombre'}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
        </button>

        {/* Sélecteur de Langue FR / EN */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setLang('FR')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              lang === 'FR'
                ? 'bg-[#00875A] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLang('EN')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              lang === 'EN'
                ? 'bg-[#00875A] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>

        {/* Profil Utilisateur */}
        <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 sm:pl-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#00875A] to-emerald-400 font-bold text-xs text-white shadow-md">
            {getInitials(me?.fullName)}
          </div>
          <div className="hidden text-left leading-snug sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {me?.fullName ?? 'Administrateur'}
            </p>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {me?.role?.label ? translateRoleLabel(me.role.label, lang) : t('topbar.super_admin')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 rounded-xl p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
            title={t('topbar.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
