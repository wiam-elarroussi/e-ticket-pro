'use client';

import { useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteRole, useRoles } from '@/hooks/useRoles';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RoleFormModal } from '@/components/roles/RoleFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Role } from '@/lib/types';

export default function RolesPage() {
  return (
    <RequirePermission permission="roles:manage">
      <RolesPageContent />
    </RequirePermission>
  );
}

function RolesPageContent() {
  const { data: roles, isLoading } = useRoles();
  const deleteRole = useDeleteRole();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('roles:manage');

  const [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Role | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Rôles & permissions</h1>
          <p className="text-sm text-slate-500">Profils système et rôles personnalisés.</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouveau rôle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : !roles?.length ? (
        <EmptyState message="Aucun rôle." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{role.label}</h3>
                {role.isSystem && (
                  <span title="Rôle système, non supprimable">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </span>
                )}
              </div>
              <p className="mb-3 font-mono text-xs text-slate-400">{role.code}</p>
              <div className="mb-4 flex flex-wrap gap-1">
                {role.rolePermissions?.slice(0, 4).map((rp) => (
                  <Badge key={rp.permission.id} tone="slate">
                    {rp.permission.code}
                  </Badge>
                ))}
                {(role.rolePermissions?.length ?? 0) > 4 && (
                  <Badge tone="slate">+{(role.rolePermissions?.length ?? 0) - 4}</Badge>
                )}
              </div>
              {canManage && (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" onClick={() => setEditing(role)} title="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!role.isSystem && (
                    <Button variant="ghost" onClick={() => setToDelete(role)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <RoleFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} role={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce rôle ?"
        description={`Le rôle "${toDelete?.label}" sera supprimé. Impossible si des utilisateurs y sont encore rattachés.`}
        confirmLabel="Supprimer"
        isLoading={deleteRole.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteRole.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
