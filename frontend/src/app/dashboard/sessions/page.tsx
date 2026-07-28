'use client';

import { useMemo, useState } from 'react';
import { ShieldAlert, ShieldX, Store } from 'lucide-react';
import {
  useAllSessions,
  useMySessions,
  useRevokeAllOtherSessions,
  useRevokeAllSessionsForUser,
  useRevokeSession,
} from '@/hooks/useSessions';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/format';
import { parseUserAgent } from '@/lib/device';
import { salesChannelTypeLabels } from '@/lib/sales-channel';
import { SessionInfo } from '@/lib/types';

type Tab = 'mine' | 'all';

export default function SessionsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSid = useAuthStore((s) => s.user?.sid);
  const canSeeAll = hasPermission('sessions:read');
  const canRevokeOthers = hasPermission('sessions:revoke');
  const canListUsers = hasPermission('users:read');

  const [tab, setTab] = useState<Tab>('mine');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [toRevoke, setToRevoke] = useState<SessionInfo | null>(null);
  const [confirmRevokeAllMine, setConfirmRevokeAllMine] = useState(false);
  const [confirmRevokeAllForUser, setConfirmRevokeAllForUser] = useState(false);

  const mySessions = useMySessions();
  const allSessions = useAllSessions(selectedUserId || undefined, tab === 'all' && canSeeAll);
  const { data: users } = useUsers();
  const revoke = useRevokeSession();
  const revokeAllMine = useRevokeAllOtherSessions();
  const revokeAllForUser = useRevokeAllSessionsForUser();

  const activeQuery = tab === 'all' ? allSessions : mySessions;
  const sessions = activeQuery.data ?? [];

  const otherMineCount = useMemo(
    () => (mySessions.data ?? []).filter((s) => s.id !== currentSid).length,
    [mySessions.data, currentSid],
  );

  const selectedUserLabel = users?.find((u) => u.id === selectedUserId)?.fullName;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sessions actives</h1>
          <p className="text-sm text-slate-500">
            Gérez vos connexions actives. Révoquer une session coupe immédiatement l’accès, même en cours d’utilisation.
          </p>
        </div>
        {canSeeAll && (
          <div className="flex w-fit rounded-lg bg-slate-100 p-1 text-sm">
            <button
              onClick={() => setTab('mine')}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === 'mine' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Mes sessions
            </button>
            <button
              onClick={() => setTab('all')}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Toutes les sessions
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {tab === 'all' && canListUsers ? (
          <Select
            className="max-w-xs"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Tous les utilisateurs</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role.label})
              </option>
            ))}
          </Select>
        ) : (
          <div />
        )}

        {tab === 'mine' && otherMineCount > 0 && (
          <Button variant="danger" onClick={() => setConfirmRevokeAllMine(true)}>
            <ShieldX className="h-4 w-4" />
            Révoquer toutes les autres sessions ({otherMineCount})
          </Button>
        )}

        {tab === 'all' && selectedUserId && canRevokeOthers && (
          <Button variant="danger" onClick={() => setConfirmRevokeAllForUser(true)}>
            <ShieldX className="h-4 w-4" />
            Révoquer toutes les sessions de {selectedUserLabel ?? 'cet utilisateur'}
          </Button>
        )}
      </div>

      {activeQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState message="Aucune session active." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {tab === 'all' && <th className="px-4 py-3 text-left font-medium text-slate-500">Utilisateur</th>}
                <th className="px-4 py-3 text-left font-medium text-slate-500">Appareil</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Canal / IP</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Dernière activité</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Expire le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSid;
                const device = parseUserAgent(session.deviceInfo?.userAgent);
                const DeviceIcon = device.icon;

                return (
                  <tr key={session.id} className={isCurrent ? 'bg-indigo-50/40' : undefined}>
                    {tab === 'all' && (
                      <td className="px-4 py-3">
                        {session.user ? (
                          <>
                            <p className="font-medium text-slate-800">{session.user.fullName}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">{session.user.username}</span>
                              <Badge tone="indigo">{session.user.role.label}</Badge>
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-700" title={session.deviceInfo?.userAgent ?? undefined}>
                        <DeviceIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{device.label}</span>
                        {isCurrent && <Badge tone="indigo">Session actuelle</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-slate-400" />
                        {session.salesChannel ? (
                          <Badge tone="slate">
                            {session.salesChannel.name} · {salesChannelTypeLabels[session.salesChannel.type]}
                          </Badge>
                        ) : (
                          <Badge tone="slate">Interface interne</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{session.ipAddress ?? 'IP inconnue'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(session.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(session.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="danger" onClick={() => setToRevoke(session)}>
                        <ShieldAlert className="h-4 w-4" />
                        Révoquer
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toRevoke}
        title="Révoquer cette session ?"
        description={
          toRevoke?.id === currentSid
            ? 'Il s’agit de votre session actuelle : vous serez immédiatement déconnecté.'
            : 'L’accès sera coupé instantanément, même si un token d’accès est encore valide.'
        }
        confirmLabel="Révoquer"
        isLoading={revoke.isPending}
        onClose={() => setToRevoke(null)}
        onConfirm={() => {
          if (!toRevoke) return;
          revoke.mutate(toRevoke.id, {
            onSuccess: () => {
              setToRevoke(null);
              if (toRevoke.id === currentSid) {
                window.location.href = '/login';
              }
            },
          });
        }}
      />

      <ConfirmDialog
        open={confirmRevokeAllMine}
        title="Révoquer toutes les autres sessions ?"
        description={`${otherMineCount} session(s) seront immédiatement déconnectée(s). Votre session actuelle n’est pas affectée.`}
        confirmLabel="Tout révoquer"
        isLoading={revokeAllMine.isPending}
        onClose={() => setConfirmRevokeAllMine(false)}
        onConfirm={() =>
          revokeAllMine.mutate(undefined, { onSuccess: () => setConfirmRevokeAllMine(false) })
        }
      />

      <ConfirmDialog
        open={confirmRevokeAllForUser}
        title="Révoquer toutes les sessions de cet utilisateur ?"
        description={`Toutes les sessions actives de ${selectedUserLabel ?? 'cet utilisateur'} seront immédiatement coupées, y compris sur des guichets ou terminaux distants.`}
        confirmLabel="Tout révoquer"
        isLoading={revokeAllForUser.isPending}
        onClose={() => setConfirmRevokeAllForUser(false)}
        onConfirm={() => {
          if (!selectedUserId) return;
          revokeAllForUser.mutate(selectedUserId, { onSuccess: () => setConfirmRevokeAllForUser(false) });
        }}
      />
    </div>
  );
}
