'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { navItems } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';

interface SidebarProps {
  /** Contrôle l'affichage du drawer sur mobile (ignoré en desktop, toujours visible). */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const items = navItems.filter((item) => !item.requiredPermission || hasPermission(item.requiredPermission));

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={clsx(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop : sidebar statique, toujours visible */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="text-lg font-bold text-slate-900">E-Ticket Pro</span>
        </div>
        {nav}
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
          Module 1 — Authentification &amp; Sécurité
        </div>
      </aside>

      {/* Mobile : drawer off-canvas avec overlay, fermé par défaut */}
      <div
        className={clsx(
          'fixed inset-0 z-40 md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={clsx(
            'fixed inset-0 bg-slate-900/50 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
            <span className="text-lg font-bold text-slate-900">E-Ticket Pro</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {nav}
          <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
            Module 1 — Authentification &amp; Sécurité
          </div>
        </aside>
      </div>
    </>
  );
}
