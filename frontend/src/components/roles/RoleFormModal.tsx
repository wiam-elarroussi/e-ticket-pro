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
import { Search, CheckSquare, Square } from 'lucide-react';
import { useI18nStore } from '@/store/i18n-store';

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
  const [search, setSearch] = useState('');
  const t = useI18nStore((s) => s.t);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ code: role?.code ?? '', label: role?.label ?? '' });
      setSelected(new Set(role?.rolePermissions?.map((rp) => rp.permission.id) ?? []));
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof catalog>();
    (catalog ?? []).forEach((perm) => {
      if (
        !search ||
        perm.code.toLowerCase().includes(search.toLowerCase()) ||
        (perm.description ?? '').toLowerCase().includes(search.toLowerCase())
      ) {
        if (!groups.has(perm.module)) groups.set(perm.module, []);
        groups.get(perm.module)!.push(perm);
      }
    });
    return Array.from(groups.entries());
  }, [catalog, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (permIds: string[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      permIds.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
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
    <Modal open={open} onClose={onClose} title={isEdit ? `${t('roles.form.edit_role')} — ${role?.label}` : t('roles.form.new_role')} widthClassName="max-w-3xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            disabled={isEdit}
            placeholder={t('roles.form.code_placeholder')}
            error={form.formState.errors.code?.message}
            {...form.register('code')}
          />
          <Input label={t('roles.form.label')} error={form.formState.errors.label?.message} {...form.register('label')} />
        </div>

        <div>
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('roles.form.attached_permissions')} ({selected.size} {t('roles.form.selected_count')})
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('roles.form.search_permission')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg border-0 bg-slate-100 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A]"
              />
            </div>
          </div>

          <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
            {grouped.map(([module, permissions]) => {
              const permIds = (permissions ?? []).map((p) => p.id);
              const allSelected = permIds.every((id) => selected.has(id));

              return (
                <div key={module} className="rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-3 shadow-2xs">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
                      {t('roles.form.module')} : {module} ({permissions?.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleGroup(permIds, !allSelected)}
                      className="text-[11px] font-bold text-[#00875A] hover:underline flex items-center gap-1"
                    >
                      {allSelected ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                      <span>{allSelected ? t('roles.form.uncheck_all') : t('roles.form.check_all')}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {permissions?.map((perm) => (
                      <label key={perm.id} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-[#00875A] focus:ring-[#00875A]"
                          checked={selected.has(perm.id)}
                          onChange={() => toggle(perm.id)}
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{perm.code}</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            {isEdit ? t('roles.form.save_changes') : t('roles.form.create_role')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

