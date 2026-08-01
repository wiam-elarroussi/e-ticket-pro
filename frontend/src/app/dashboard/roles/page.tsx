'use client';

import { useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Shield, Check, X, LayoutGrid, Table, Search, Trash2 } from 'lucide-react';
import { useDeleteRole, useRoles, usePermissionsCatalog } from '@/hooks/useRoles';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RoleFormModal } from '@/components/roles/RoleFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Role } from '@/lib/types';
import { translateRoleLabel } from '@/lib/roles';

type ViewMode = 'cards' | 'matrix';

export default function RolesPage() {
  return (
    <RequirePermission permission="roles:manage">
      <RolesPageContent />
    </RequirePermission>
  );
}

function RolesPageContent() {
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: catalog, isLoading: loadingCatalog } = usePermissionsCatalog();
  const deleteRole = useDeleteRole();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('roles:manage');
  const { lang, t } = useI18nStore();

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Role | null>(null);

  const isLoading = loadingRoles || loadingCatalog;

  // Organiser le catalogue par modules métier
  const catalogGrouped = useMemo(() => {
    const map = new Map<string, typeof catalog>();
    (catalog ?? []).forEach((p) => {
      if (!matrixSearch || p.code.toLowerCase().includes(matrixSearch.toLowerCase()) || (p.description ?? '').toLowerCase().includes(matrixSearch.toLowerCase())) {
        if (!map.has(p.module)) map.set(p.module, []);
        map.get(p.module)!.push(p);
      }
    });
    return Array.from(map.entries());
  }, [catalog, matrixSearch]);

  // Set pour vérification rapide rôle <-> permission dans la matrice
  const rolePermissionSet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (roles ?? []).forEach((r) => {
      const permIds = new Set((r.rolePermissions ?? []).map((rp) => rp.permission.id));
      map.set(r.id, permIds);
    });
    return map;
  }, [roles]);

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
              {t('roles.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('roles.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('roles.desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bascule de vue Cartes / Matrice comparative */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 ring-1 ring-slate-200 dark:ring-slate-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{t('roles.role_cards')}</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'matrix' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>{t('roles.comparison_matrix')}</span>
            </button>
          </div>

          {canManage && (
            <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('roles.new_role_button')}</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : !roles?.length ? (
        <EmptyState message={t('roles.no_role_defined')} />
      ) : viewMode === 'cards' ? (
        /* Vue Cartes des Rôles */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-[#00875A]" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {translateRoleLabel(role.label, lang)}
                    </h3>
                  </div>
                  {['SUPER_ADMIN', 'SUPERVISEUR', 'CAISSIER', 'CONTROLEUR'].includes(role.code) && (
                    <span title={t('roles.default_system_role')}>
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                  )}
                </div>
                <p className="mb-4 font-mono text-xs font-semibold text-slate-400">Code: {role.code}</p>

                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('roles.included_permissions')} ({role.rolePermissions?.length ?? 0}) :
                </p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {role.rolePermissions?.slice(0, 5).map((rp) => (
                    <span key={rp.permission.id} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      {rp.permission.code}
                    </span>
                  ))}
                  {(role.rolePermissions?.length ?? 0) > 5 && (
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#00875A]">
                      +{(role.rolePermissions?.length ?? 0) - 5} {t('roles.others')}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setEditing(role)} title={t('roles.edit_role_permissions')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setToDelete(role)} title={t('roles.delete_role')}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Vue Matrice Comparative Synthétique */
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('roles.filter_matrix_placeholder')}
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              className="w-full rounded-xl border-0 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-[#00875A]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('roles.th_module_permission')}
                    </th>
                    {roles.map((r) => (
                      <th key={r.id} className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        {translateRoleLabel(r.label, lang)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {catalogGrouped.map(([moduleName, permissions]) => (
                    <>
                      <tr key={moduleName} className="bg-slate-100/60 dark:bg-slate-800/60">
                        <td colSpan={roles.length + 1} className="px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-[#00875A]">
                          {t('roles.module_label')} : {moduleName}
                        </td>
                      </tr>
                      {permissions?.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{p.code}</span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.description}</p>
                          </td>
                          {roles.map((r) => {
                            const hasPerm = rolePermissionSet.get(r.id)?.has(p.id);
                            return (
                              <td key={r.id} className="px-4 py-3 text-center">
                                {hasPerm ? (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[#00875A]">
                                    <Check className="h-4 w-4 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300">
                                    <X className="h-3.5 w-3.5 stroke-[2]" />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <RoleFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} role={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('roles.confirm_delete_title')}
        description={`${t('roles.confirm_delete_the_role')} "${toDelete?.label}" ${t('roles.confirm_delete_desc')}`}
        confirmLabel={t('roles.delete_button')}
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



