'use client';

import { useMemo, useState } from 'react';
import { ShieldAlert, ShieldX, Store, Filter, MapPin } from 'lucide-react';
import {
  useAllSessions,
  useMySessions,
  useRevokeAllOtherSessions,
  useRevokeAllSessionsForUser,
  useRevokeSession,
} from '@/hooks/useSessions';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/format';
import { parseUserAgent } from '@/lib/device';
import { getSalesChannelTypeLabels } from '@/lib/sales-channel';
import { SessionInfo } from '@/lib/types';

type Tab = 'mine' | 'all';
type ChannelFilter = 'ALL' | 'POS' | 'WEB' | 'ACCESS' | 'ADMIN';

export default function SessionsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSid = useAuthStore((s) => s.user?.sid);
  const canSeeAll = hasPermission('sessions:read');
  const canRevokeOthers = hasPermission('sessions:revoke');
  const canListUsers = hasPermission('users:read');
  const { t } = useI18nStore();

  const [tab, setTab] = useState<Tab>('mine');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
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
  const rawSessions = activeQuery.data ?? [];

  // Filtrage par type de canal
  const sessions = useMemo(() => {
    if (channelFilter === 'ALL') return rawSessions;
    return rawSessions.filter((s) => {
      const type = s.salesChannel?.type;
      if (channelFilter === 'POS') return type === 'LOCAL_POS' || type === 'REMOTE_POS';
      if (channelFilter === 'WEB') return type === 'WEB';
      if (channelFilter === 'ACCESS') return type === 'PARTNER_API';
      if (channelFilter === 'ADMIN') return !s.salesChannel;
      return true;
    });
  }, [rawSessions, channelFilter]);

  const otherMineCount = useMemo(
    () => (mySessions.data ?? []).filter((s) => s.id !== currentSid).length,
    [mySessions.data, currentSid],
  );

  const selectedUserLabel = users?.find((u) => u.id === selectedUserId)?.fullName;

  return (
    <div className="space-y-6">
      {/* En-tête du module avec résumé de sécurité */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('sessions.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('sessions.page_title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('sessions.page_desc')}
          </p>
        </div>

        {canSeeAll && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 ring-1 ring-slate-200 dark:ring-slate-700">
            <button
              onClick={() => setTab('mine')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                tab === 'mine' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('sessions.my_sessions')} ({mySessions.data?.length ?? 0})
            </button>
            <button
              onClick={() => setTab('all')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                tab === 'all' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('sessions.all_sessions')} ({allSessions.data?.length ?? 0})
            </button>
          </div>
        )}
      </div>

      {/* Barre de filtres par canal et actions de masse */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" /> {t('sessions.channel_label')}
          </span>
          <button
            onClick={() => setChannelFilter('ALL')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              channelFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('sessions.all_channels')}
          </button>
          <button
            onClick={() => setChannelFilter('POS')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              channelFilter === 'POS' ? 'bg-[#00875A] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('sessions.pos_desks')}
          </button>
          <button
            onClick={() => setChannelFilter('WEB')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              channelFilter === 'WEB' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('sessions.web_mobile')}
          </button>
          <button
            onClick={() => setChannelFilter('ACCESS')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              channelFilter === 'ACCESS' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('sessions.gates_scans')}
          </button>
          <button
            onClick={() => setChannelFilter('ADMIN')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
              channelFilter === 'ADMIN' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('sessions.internal_admin')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tab === 'all' && canListUsers && (
            <Select
              className="max-w-xs text-xs"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">{t('sessions.all_users')}</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role.label})
                </option>
              ))}
            </Select>
          )}

          {tab === 'mine' && otherMineCount > 0 && (
            <Button variant="danger" onClick={() => setConfirmRevokeAllMine(true)}>
              <ShieldX className="h-4 w-4" />
              <span>{t('sessions.revoke_my_other_sessions')} ({otherMineCount})</span>
            </Button>
          )}

          {tab === 'all' && selectedUserId && canRevokeOthers && (
            <Button variant="danger" onClick={() => setConfirmRevokeAllForUser(true)}>
              <ShieldX className="h-4 w-4" />
              <span>{t('sessions.emergency_cutoff_for')} ({selectedUserLabel})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Liste des sessions */}
      {activeQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState message={t('sessions.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  {tab === 'all' && (
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('sessions.th_user')}
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('sessions.th_device')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('sessions.th_channel_ip')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('sessions.th_last_activity')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('sessions.th_jwt_expiration')}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('sessions.th_emergency_action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((session) => {
                  const isCurrent = session.id === currentSid;
                  const device = parseUserAgent(session.deviceInfo, session.salesChannel, t);
                  const DeviceIcon = device.icon;

                  return (
                    <tr key={session.id} className={isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors'}>
                      {tab === 'all' && (
                        <td className="px-5 py-4">
                          {session.user ? (
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{session.user.fullName}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-400">@{session.user.username}</span>
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#00875A] ring-1 ring-emerald-200">
                                  {session.user.role.label}
                                </span>
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-semibold" title={session.deviceInfo?.userAgent ?? undefined}>
                          <DeviceIcon className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                          <span>{device.label}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-[#00875A] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              {t('sessions.current_session')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          {session.salesChannel ? (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-700">
                              {session.salesChannel.name} · {getSalesChannelTypeLabels(t)[session.salesChannel.type]}
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                              {t('sessions.internal_admin_interface')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{session.ipAddress ?? '127.0.0.1 (Local Stadium)'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(session.lastActivityAt)}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDateTime(session.expiresAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="danger" onClick={() => setToRevoke(session)}>
                          <ShieldAlert className="h-4 w-4" />
                          <span>{t('sessions.revoke')}</span>
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

      {/* Diadlogues de confirmation de révocation */}
      <ConfirmDialog
        open={!!toRevoke}
        title={t('sessions.confirm_revoke_title')}
        description={
          toRevoke?.id === currentSid
            ? t('sessions.confirm_revoke_current_desc')
            : t('sessions.confirm_revoke_other_desc')
        }
        confirmLabel={t('sessions.confirm_revoke_button')}
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
        title={t('sessions.confirm_revoke_all_mine_title')}
        description={`${otherMineCount} ${t('sessions.confirm_revoke_all_mine_desc_suffix')}`}
        confirmLabel={t('sessions.revoke_all_button')}
        isLoading={revokeAllMine.isPending}
        onClose={() => setConfirmRevokeAllMine(false)}
        onConfirm={() =>
          revokeAllMine.mutate(undefined, { onSuccess: () => setConfirmRevokeAllMine(false) })
        }
      />

      <ConfirmDialog
        open={confirmRevokeAllForUser}
        title={t('sessions.confirm_cutoff_user_title')}
        description={`${t('sessions.confirm_cutoff_user_desc_prefix')} ${selectedUserLabel ?? t('sessions.this_user')} ${t('sessions.confirm_cutoff_user_desc_suffix')}`}
        confirmLabel={t('sessions.emergency_cutoff_button')}
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


