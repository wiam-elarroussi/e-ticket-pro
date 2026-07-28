'use client';

import { useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteUser, useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/auth-store';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { UserFormModal } from '@/components/users/UserFormModal';
import { UserPermissionsDrawer } from '@/components/users/UserPermissionsDrawer';
import { User } from '@/lib/types';
import { formatDateTime, formatRelativeToNow } from '@/lib/format';

function PresenceIndicator({ isOnline, lastSeenAt }: { isOnline?: boolean; lastSeenAt?: string | null }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      <span
        className={
          isOnline
            ? 'h-2 w-2 shrink-0 rounded-full bg-green-500'
            : 'h-2 w-2 shrink-0 rounded-full bg-slate-300'
        }
        aria-hidden="true"
      />
      <span className={isOnline ? 'font-medium text-green-700' : 'text-slate-500'}>
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
      <span className="text-slate-400" title={lastSeenAt ? formatDateTime(lastSeenAt) : undefined}>
        ·{' '}
        {lastSeenAt
          ? `Dernière connexion : ${formatRelativeToNow(lastSeenAt)}`
          : 'Jamais connecté'}
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
  const deleteUser = useDeleteUser();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUserId = useAuthStore((s) => s.user?.sub);

  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  // On stocke l'id, pas l'objet : l'objet capturé au clic devient obsolète
  // dès que la liste se rafraîchit (après une mutation de permission), alors
  // que ce lookup recalculé à chaque render reste toujours synchronisé avec
  // le cache React Query.
  const [permissionsForId, setPermissionsForId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const permissionsForUser = permissionsForId ? users?.find((u) => u.id === permissionsForId) ?? null : null;

  const canCreate = hasPermission('users:create');
  const canUpdate = hasPermission('users:update');
  const canDelete = hasPermission('users:delete');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500">Comptes, rôles et permissions granulaires.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : !users?.length ? (
        <EmptyState message="Aucun utilisateur." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Utilisateur</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {user.username} · {user.email}
                    </p>
                    <PresenceIndicator isOnline={user.isOnline} lastSeenAt={user.lastSeenAt} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="indigo">{user.role.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Désactivé</Badge>}
                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                      <span className="ml-2">
                        <Badge tone="amber">Verrouillé</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <>
                          <Button variant="ghost" onClick={() => setPermissionsForId(user.id)} title="Permissions">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => setEditing(user)} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canDelete && user.id !== currentUserId && (
                        <Button variant="ghost" onClick={() => setToDelete(user)} title="Supprimer">
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

      <UserFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} user={editing} />

      <UserPermissionsDrawer
        open={!!permissionsForId}
        onClose={() => setPermissionsForId(null)}
        user={permissionsForUser}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cet utilisateur ?"
        description={`${toDelete?.fullName} (${toDelete?.username}) perdra définitivement l’accès. Cette action est irréversible.`}
        confirmLabel="Supprimer"
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
