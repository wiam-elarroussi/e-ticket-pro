'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Ban, Plus, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { usePermissionsCatalog } from '@/hooks/useRoles';
import { useRemoveUserPermission, useSetUserPermission } from '@/hooks/useUsers';
import { User } from '@/lib/types';

type EffectiveStatus = 'INHERITED' | 'GRANT' | 'DENY' | 'NONE';

interface UserPermissionsDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserPermissionsDrawer({ open, onClose, user }: UserPermissionsDrawerProps) {
  const { data: catalog } = usePermissionsCatalog();
  const setOverride = useSetUserPermission();
  const removeOverride = useRemoveUserPermission();

  const rolePermissionCodes = useMemo(
    () => new Set(user?.role.rolePermissions?.map((rp) => rp.permission.code) ?? []),
    [user],
  );

  const overridesByPermissionId = useMemo(() => {
    const map = new Map<string, 'GRANT' | 'DENY'>();
    user?.userPermissions?.forEach((up) => map.set(up.permission.id, up.effect));
    return map;
  }, [user]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof catalog>();
    (catalog ?? []).forEach((perm) => {
      if (!groups.has(perm.module)) groups.set(perm.module, []);
      groups.get(perm.module)!.push(perm);
    });
    return Array.from(groups.entries());
  }, [catalog]);

  if (!user) return null;

  const isPending = setOverride.isPending || removeOverride.isPending;

  return (
    <Modal open={open} onClose={onClose} title={`Permissions — ${user.fullName}`} widthClassName="max-w-3xl">
      <p className="mb-4 text-sm text-slate-500">
        Le rôle <strong>{user.role.label}</strong> accorde certaines permissions par défaut. Les 3 boutons sont
        identiques pour chaque ligne : <strong>Par défaut</strong> applique le comportement du rôle,{' '}
        <strong>Autoriser</strong> / <strong>Interdire</strong> créent une exception <strong>pour cet utilisateur
        uniquement</strong>, quel que soit son rôle.
      </p>
      <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
        {grouped.map(([module, permissions]) => (
          <div key={module}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{module}</h3>
            <ul className="space-y-2">
              {permissions?.map((perm) => {
                const inherited = rolePermissionCodes.has(perm.code);
                const override = overridesByPermissionId.get(perm.id);
                const status: EffectiveStatus =
                  override === 'GRANT' ? 'GRANT' : override === 'DENY' ? 'DENY' : inherited ? 'INHERITED' : 'NONE';

                return (
                  <li
                    key={perm.id}
                    className="flex flex-col gap-2 rounded-md border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />
                        <p className="truncate font-mono text-xs text-slate-700">{perm.code}</p>
                      </div>
                      <p className="text-xs text-slate-500">{perm.description}</p>
                    </div>

                    {/* Groupe de 3 boutons strictement identique (libellé, icône, ordre) sur
                        toutes les lignes — seul l'état "actif" change selon le statut courant.
                        Le badge à gauche est seul responsable de préciser si "Par défaut"
                        signifie ici hérité du rôle ou non attribué. */}
                    <div className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-slate-300">
                      <SegmentButton
                        active={status === 'INHERITED' || status === 'NONE'}
                        disabled={isPending || !override}
                        onClick={() => removeOverride.mutate({ id: user.id, permissionId: perm.id })}
                        icon={RotateCcw}
                        label="Par défaut"
                        tone="slate"
                      />
                      <SegmentButton
                        active={status === 'GRANT'}
                        disabled={isPending || status === 'GRANT'}
                        onClick={() => setOverride.mutate({ id: user.id, permissionId: perm.id, effect: 'GRANT' })}
                        icon={Plus}
                        label="Autoriser"
                        tone="green"
                      />
                      <SegmentButton
                        active={status === 'DENY'}
                        disabled={isPending || status === 'DENY'}
                        onClick={() => setOverride.mutate({ id: user.id, permissionId: perm.id, effect: 'DENY' })}
                        icon={Ban}
                        label="Interdire"
                        tone="red"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  switch (status) {
    case 'INHERITED':
      return <Badge tone="indigo">🛡️ Héritée du rôle</Badge>;
    case 'GRANT':
      return <Badge tone="green">➕ Accordée (Exception)</Badge>;
    case 'DENY':
      return <Badge tone="red">🚫 Refusée (Exception)</Badge>;
    case 'NONE':
      return <Badge tone="slate">⚪ Non attribuée</Badge>;
  }
}

const segmentToneClasses = {
  slate: { active: 'bg-slate-200 text-slate-800', inactive: 'text-slate-400 hover:bg-slate-50' },
  green: { active: 'bg-green-600 text-white', inactive: 'text-slate-400 hover:bg-green-50 hover:text-green-700' },
  red: { active: 'bg-red-600 text-white', inactive: 'text-slate-400 hover:bg-red-50 hover:text-red-700' },
} as const;

function SegmentButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Plus;
  label: string;
  tone: keyof typeof segmentToneClasses;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={clsx(
        'flex items-center gap-1 border-l border-slate-200 px-2.5 py-1.5 text-xs font-medium transition-colors first:border-l-0 disabled:cursor-default',
        active ? segmentToneClasses[tone].active : segmentToneClasses[tone].inactive,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
