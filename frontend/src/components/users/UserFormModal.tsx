'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useRoles } from '@/hooks/useRoles';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';
import { translateRoleLabel } from '@/lib/roles';
import { User } from '@/lib/types';

const USERNAME_RULE = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_RULE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    username: z.string().min(3).max(50).regex(USERNAME_RULE, t('users.form.username_invalid')),
    email: z.string().email(),
    fullName: z.string().min(2).max(150),
    roleId: z.string().uuid(t('users.form.select_role')),
    password: z
      .string()
      .min(12, t('users.form.password_min'))
      .max(128)
      .regex(PASSWORD_RULE, t('users.form.password_complexity'))
      .optional()
      .or(z.literal('')),
    isActive: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const isEdit = !!user;
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { lang, t } = useI18nStore();
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset(
        user
          ? {
              username: user.username,
              email: user.email,
              fullName: user.fullName,
              roleId: user.roleId,
              isActive: user.isActive,
              password: '',
            }
          : { username: '', email: '', fullName: '', roleId: '', password: '' },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const isPending = createUser.isPending || updateUser.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && user) {
      await updateUser.mutateAsync({
        id: user.id,
        payload: {
          username: values.username,
          email: values.email,
          fullName: values.fullName,
          roleId: values.roleId,
          isActive: values.isActive,
        },
      });
    } else {
      if (!values.password) {
        form.setError('password', { message: t('users.form.password_required') });
        return;
      }
      await createUser.mutateAsync({
        username: values.username,
        email: values.email,
        fullName: values.fullName,
        roleId: values.roleId,
        password: values.password,
      });
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('users.form.edit_user') : t('users.form.new_user')}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('users.form.username')}
          error={form.formState.errors.username?.message}
          {...form.register('username')}
        />
        <Input
          label={t('ui.email')}
          type="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label={t('users.form.full_name')}
          error={form.formState.errors.fullName?.message}
          {...form.register('fullName')}
        />
        <Select
          label={t('users.form.role')}
          error={form.formState.errors.roleId?.message}
          {...form.register('roleId')}
        >
          <option value="">{t('users.form.select_role_placeholder')}</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.id}>
              {translateRoleLabel(role.label, lang)}
            </option>
          ))}
        </Select>
        {!isEdit && (
          <Input
            label={t('users.form.initial_password')}
            type="password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 text-[#00875A]" {...form.register('isActive')} />
            <span>{t('users.form.active_account')}</span>
          </label>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            {isEdit ? t('ui.save') : t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

