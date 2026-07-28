'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePermissionsCatalog } from '@/hooks/useRoles';
import { useCreateRole, useUpdateRole } from '@/hooks/useRoles';
import { Role } from '@/lib/types';

const schema = z.object({
  code: z.string().min(2).max(50),
  label: z.string().min(2).max(100),
});

type FormValues = z.infer<typeof schema>;

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
}

export function RoleFormModal({ open, onClose, role }: RoleFormModalProps) {
  const isEdit = !!role;
  const { data: catalog } = usePermissionsCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ code: role?.code ?? '', label: role?.label ?? '' });
      setSelected(new Set(role?.rolePermissions?.map((rp) => rp.permission.id) ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof catalog>();
    (catalog ?? []).forEach((perm) => {
      if (!groups.has(perm.module)) groups.set(perm.module, []);
      groups.get(perm.module)!.push(perm);
    });
    return Array.from(groups.entries());
  }, [catalog]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isPending = createRole.isPending || updateRole.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && role) {
      await updateRole.mutateAsync({
        id: role.id,
        payload: { label: values.label, permissionIds: Array.from(selected) },
      });
    } else {
      await createRole.mutateAsync({
        code: values.code,
        label: values.label,
        permissionIds: Array.from(selected),
      });
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le rôle' : 'Nouveau rôle'} widthClassName="max-w-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            disabled={isEdit}
            placeholder="EX: SUPERVISEUR_STADE"
            error={form.formState.errors.code?.message}
            {...form.register('code')}
          />
          <Input label="Libellé" error={form.formState.errors.label?.message} {...form.register('label')} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
          <div className="max-h-72 space-y-4 overflow-y-auto rounded-md border border-slate-200 p-3">
            {grouped.map(([module, permissions]) => (
              <div key={module}>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{module}</h4>
                <div className="space-y-1">
                  {permissions?.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selected.has(perm.id)}
                        onChange={() => toggle(perm.id)}
                      />
                      <span className="font-mono text-xs">{perm.code}</span>
                      <span className="text-slate-400">— {perm.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
