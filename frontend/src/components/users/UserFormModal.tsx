'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useRoles } from '@/hooks/useRoles';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { User } from '@/lib/types';

const USERNAME_RULE = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_RULE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;

// Schéma unique (plutôt que deux schémas branchés create/edit) : évite un
// conflit de type react-hook-form/zod entre schémas hétérogènes. Le mot de
// passe est optionnel dans le schéma mais requis manuellement en création
// (le champ n'est de toute façon rendu que dans ce cas).
const schema = z.object({
  username: z.string().min(3).max(50).regex(USERNAME_RULE, 'Lettres, chiffres, points, tirets, underscores'),
  email: z.string().email(),
  fullName: z.string().min(2).max(150),
  roleId: z.string().uuid('Sélectionnez un rôle'),
  password: z
    .string()
    .min(12, 'Minimum 12 caractères')
    .max(128)
    .regex(PASSWORD_RULE, 'Majuscule, minuscule, chiffre et caractère spécial requis')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

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
        form.setError('password', { message: 'Mot de passe requis' });
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Identifiant" error={form.formState.errors.username?.message} {...form.register('username')} />
        <Input label="Email" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Input label="Nom complet" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
        <Select label="Rôle" error={form.formState.errors.roleId?.message} {...form.register('roleId')}>
          <option value="">Sélectionner…</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </Select>
        {!isEdit && (
          <Input
            label="Mot de passe initial"
            type="password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="rounded border-slate-300" {...form.register('isActive')} />
            Compte actif
          </label>
        )}
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
