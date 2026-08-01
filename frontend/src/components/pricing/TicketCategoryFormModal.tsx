'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateTicketCategory, useUpdateTicketCategory } from '@/hooks/useTicketCategories';
import { AccreditationType, TicketCategory } from '@/lib/pricing-types';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const ACCREDITATION_TYPES: AccreditationType[] = ['PUBLIC', 'VIP', 'PRESS', 'DELEGATION', 'STAFF'];

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    code: z
      .string()
      .min(1)
      .max(30)
      .regex(/^[A-Z0-9_]+$/, t('pricing.form.code_invalid')),
    name: z.string().min(1).max(100),
    isFree: z.boolean(),
    requiresNominativeInfo: z.boolean(),
    accreditationType: z.enum(['PUBLIC', 'VIP', 'PRESS', 'DELEGATION', 'STAFF']),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface TicketCategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: TicketCategory | null;
}

export function TicketCategoryFormModal({ open, onClose, category }: TicketCategoryFormModalProps) {
  const isEdit = !!category;
  const createCategory = useCreateTicketCategory();
  const updateCategory = useUpdateTicketCategory();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        code: category?.code ?? '',
        name: category?.name ?? '',
        isFree: category?.isFree ?? false,
        requiresNominativeInfo: category?.requiresNominativeInfo ?? false,
        accreditationType: category?.accreditationType ?? 'PUBLIC',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && category) {
      await updateCategory.mutateAsync({
        id: category.id,
        payload: {
          name: values.name,
          isFree: values.isFree,
          requiresNominativeInfo: values.requiresNominativeInfo,
          accreditationType: values.accreditationType,
        },
      });
    } else {
      await createCategory.mutateAsync(values);
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('pricing.form.edit_category') : t('pricing.form.new_category')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Code"
          placeholder={t('pricing.form.code_placeholder')}
          disabled={isEdit}
          error={form.formState.errors.code?.message}
          {...form.register('code')}
          onChange={(e) => form.setValue('code', e.target.value.toUpperCase())}
        />
        <Input label={t('pricing.form.display_name')} error={form.formState.errors.name?.message} {...form.register('name')} />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" {...form.register('isFree')} />
          {t('pricing.form.free_category')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" {...form.register('requiresNominativeInfo')} />
          {t('pricing.form.nominative_ticket')}
        </label>
        <Select label={t('pricing.form.accreditation_type')} {...form.register('accreditationType')}>
          {ACCREDITATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`pricing.accreditation.${type.toLowerCase()}` as TranslationKey)}
            </option>
          ))}
        </Select>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? t('ui.save') : t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
