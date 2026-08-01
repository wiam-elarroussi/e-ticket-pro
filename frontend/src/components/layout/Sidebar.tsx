'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Ticket, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { navCategories } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredCategories = navCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => !i.requiredPermission || hasPermission(i.requiredPermission)),
    }))
    .filter((cat) => cat.items.length > 0);

  const logo = (compact: boolean) => (
    <span className="flex items-center gap-3 text-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00875A] to-emerald-400 text-white shadow-lg glow-emerald">
        <Ticket className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold tracking-tight text-white">E-Ticket Pro</span>
          <span className="block text-[11px] font-semibold text-emerald-400/90">{t('topbar.tagline')}</span>
        </span>
      )}
    </span>
  );

  const nav = (compact: boolean) => (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {filteredCategories.map((cat) => (
        <div key={cat.id}>
          {!compact && (
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              {t(cat.titleKey)}
            </p>
          )}
          <nav className="space-y-1">
            {cat.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              const translatedLabel = t(item.translationKey);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group relative flex items-center rounded-xl font-semibold text-sm transition-all duration-200',
                    compact ? 'justify-center p-3' : 'gap-3.5 px-3.5 py-2.5',
                    active
                      ? 'bg-gradient-to-r from-[#00875A] to-emerald-600 text-white shadow-md glow-emerald font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
                  )}
                  title={compact ? translatedLabel : undefined}
                >
                  <Icon
                    className={clsx(
                      'shrink-0 transition-transform duration-200 group-hover:scale-110',
                      compact ? 'h-5 w-5' : 'h-4 w-4',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400',
                    )}
                  />
                  {!compact && <span className="truncate">{translatedLabel}</span>}
                  {active && !compact && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-white shadow-xs" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Overlay Mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer Mobile */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 border-r border-slate-800 shadow-2xl transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/80">
          {logo(false)}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav(false)}
      </aside>

      {/* Sidebar Desktop */}
      <aside
        className={clsx(
          'hidden flex-col bg-slate-900 border-r border-slate-800/80 transition-all duration-300 md:flex shrink-0 shadow-xl z-20',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        <div
          className={clsx(
            'flex h-20 items-center border-b border-slate-800/80 px-5',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {logo(collapsed)}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={collapsed ? 'Développer' : 'Réduire'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        {nav(collapsed)}
      </aside>
    </>
  );
}
