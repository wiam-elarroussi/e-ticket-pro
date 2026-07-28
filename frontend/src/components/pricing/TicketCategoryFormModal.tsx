'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTicketCategory, useUpdateTicketCategory } from '@/hooks/useTicketCategories';
import { TicketCategory } from '@/lib/pricing-types';

const schema = z.object({
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'Majuscules, chiffres et underscores uniquement (ex: PLEIN_TARIF)'),
  name: z.string().min(1).max(100),
  isFree: z.boolean(),
  requiresNominativeInfo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TicketCategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: TicketCategory | null;
}

export function TicketCategoryFormModal({ open, onClose, category }: TicketCategoryFormModalProps) {
  const isEdit = !!category;
  const createCategory = useCreateTicketCategory();
  const updateCategory = useUpdateTicketCategory();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        code: category?.code ?? '',
        name: category?.name ?? '',
        isFree: category?.isFree ?? false,
        requiresNominativeInfo: category?.requiresNominativeInfo ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && category) {
      await updateCategory.mutateAsync({
        id: category.id,
        payload: { name: values.name, isFree: values.isFree, requiresNominativeInfo: values.requiresNominativeInfo },
      });
    } else {
      await createCategory.mutateAsync(values);
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie de billet'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Code"
          placeholder="EX: PLEIN_TARIF"
          disabled={isEdit}
          error={form.formState.errors.code?.message}
          {...form.register('code')}
          onChange={(e) => form.setValue('code', e.target.value.toUpperCase())}
        />
        <Input label="Nom affiché" error={form.formState.errors.name?.message} {...form.register('name')} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300" {...form.register('isFree')} />
          Catégorie gratuite (invitation, presse, staff…)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300" {...form.register('requiresNominativeInfo')} />
          Billet nominatif (saisie acheteur obligatoire à la vente)
        </label>
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
