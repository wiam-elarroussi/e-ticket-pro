'use client';

import Link from 'next/link';
import { Users, ShieldCheck, MonitorSmartphone, Handshake } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';

const tiles = [
  {
    href: '/dashboard/users',
    label: 'Utilisateurs',
    description: 'Comptes, rôles, permissions granulaires',
    icon: Users,
    permission: 'users:read',
  },
  {
    href: '/dashboard/roles',
    label: 'Rôles & permissions',
    description: 'Profils système et rôles personnalisés',
    icon: ShieldCheck,
  },
  {
    href: '/dashboard/sessions',
    label: 'Sessions actives',
    description: 'Vos sessions et révocation d’urgence',
    icon: MonitorSmartphone,
  },
  {
    href: '/dashboard/partners',
    label: 'Partenaires',
    description: 'Vendeurs externes, canaux de vente, quotas',
    icon: Handshake,
    permission: 'partners:read',
  },
];

export default function DashboardHomePage() {
  const { data: me } = useMe();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Connecté en tant que</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{me?.fullName ?? '—'}</h1>
          {me && <Badge tone="indigo">{me.role.label}</Badge>}
          {me && !me.isActive && <Badge tone="red">Compte désactivé</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate-500">{me?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles
          .filter((tile) => !tile.permission || hasPermission(tile.permission))
          .map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
              >
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{tile.label}</p>
                  <p className="text-sm text-slate-500">{tile.description}</p>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
