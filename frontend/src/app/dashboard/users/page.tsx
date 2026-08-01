'use client';

import { useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Search, Trash2, UserCheck, UserX, Lock, RefreshCw } from 'lucide-react';
import { useDeleteUser, useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { UserFormModal } from '@/components/users/UserFormModal';
import { UserPermissionsDrawer } from '@/components/users/UserPermissionsDrawer';
import { PasswordResetModal } from '@/components/users/PasswordResetModal';
import { User } from '@/lib/types';
import { formatDateTime, formatRelativeToNow } from '@/lib/format';

function PresenceIndicator({ isOnline, lastSeenAt }: { isOnline?: boolean; lastSeenAt?: string | null }) {
  const t = useI18nStore((s) => s.t);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      <span
        className={
          isOnline
            ? 'h-2 w-2 shrink-0 rounded-full bg-[#00875A] animate-pulse'
            : 'h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600'
        }
        aria-hidden="true"
      />
      <span className={isOnline ? 'font-bold text-[#00875A]' : 'text-slate-500 dark:text-slate-400'}>
        {isOnline ? t('users.online') : t('users.offline')}
      </span>
      <span className="text-slate-400" title={lastSeenAt ? formatDateTime(lastSeenAt) : undefined}>
        · {lastSeenAt ? `${t('users.last_seen')} ${formatRelativeToNow(lastSeenAt)}` : t('users.never_logged_in')}
      </span>
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission permission="users:read">
      <UsersPageContent />
    </RequirePermission>
  );
}

function UsersPageContent() {
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const deleteUser = useDeleteUser();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUserId = useAuthStore((s) => s.user?.sub);
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [permissionsForId, setPermissionsForId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const permissionsForUser = permissionsForId ? users?.find((u) => u.id === permissionsForId) ?? null : null;

  const canCreate = hasPermission('users:create');
  const canUpdate = hasPermission('users:update');
  const canDelete = hasPermission('users:delete');

  // Filtrage combiné par Recherche, Rôle et Statut
  const filteredUsers = useMemo(() => {
    return (users ?? []).filter((u) => {
      const matchSearch =
        !search ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      const matchRole = !roleFilter || u.roleId === roleFilter || u.role.code === roleFilter;

      let matchStatus = true;
      if (statusFilter === 'ONLINE') matchStatus = !!u.isOnline;
      if (statusFilter === 'ACTIVE') matchStatus = u.isActive && (!u.lockedUntil || new Date(u.lockedUntil) <= new Date());
      if (statusFilter === 'DISABLED') matchStatus = !u.isActive;
      if (statusFilter === 'LOCKED') matchStatus = !!(u.lockedUntil && new Date(u.lockedUntil) > new Date());

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('users.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('users.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('users.desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)} className="bg-[#00875A] hover:bg-[#00754e] text-white">
            <Plus className="h-4 w-4" />
            <span>{t('users.new_user_button')}</span>
          </Button>
        )}
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>

        <div className="sm:col-span-3">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs">
            <option value="">{t('users.all_roles')}</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs">
            <option value="">{t('users.all_statuses')}</option>
            <option value="ONLINE">🟢 {t('users.online_only')}</option>
            <option value="ACTIVE">{t('ui.active')}</option>
            <option value="DISABLED">{t('users.status_disabled')}</option>
            <option value="LOCKED">⚠️ {t('users.locked_attempts')}</option>
          </Select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : !filteredUsers.length ? (
        <EmptyState message={t('users.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('users.th_user_presence')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('users.th_assigned_role')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('users.th_account_state')}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-extrabold text-xs text-[#00875A] ring-1 ring-slate-200 dark:ring-slate-700">
                          {getInitials(user.fullName)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            @{user.username} · {user.email}
                          </p>
                          <PresenceIndicator isOnline={user.isOnline} lastSeenAt={user.lastSeenAt} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                        {user.role.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" /> {t('ui.active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                            <UserX className="h-3.5 w-3.5" /> {t('users.status_disabled')}
                          </span>
                        )}

                        {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                            <Lock className="h-3.5 w-3.5" /> {t('users.status_locked')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canUpdate && (
                          <>
                            <Button
                              variant="ghost"
                              onClick={() => setResetUser(user)}
                              title={t('users.reset_password_title')}
                              className="hover:bg-amber-50 hover:text-amber-600"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setPermissionsForId(user.id)}
                              title={t('users.granular_permissions')}
                              className="hover:bg-emerald-50 hover:text-[#00875A]"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" onClick={() => setEditing(user)} title={t('ui.edit')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && user.id !== currentUserId && (
                          <Button variant="ghost" onClick={() => setToDelete(user)} title={t('ui.delete')}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulaires et Tiroirs de gestion */}
      <UserFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} user={editing} />

      <UserPermissionsDrawer
        open={!!permissionsForId}
        onClose={() => setPermissionsForId(null)}
        user={permissionsForUser}
      />

      <PasswordResetModal open={!!resetUser} onClose={() => setResetUser(null)} user={resetUser} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('users.confirm_delete_title')}
        description={`${toDelete?.fullName} (@${toDelete?.username}) ${t('users.confirm_delete_desc')}`}
        confirmLabel={t('users.confirm_delete_button')}
        isLoading={deleteUser.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteUser.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}


