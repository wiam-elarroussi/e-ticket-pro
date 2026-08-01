'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateZone } from '@/hooks/useZones';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    name: z.string().min(1).max(100),
    colorHex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6,8}$/, t('venues.form.color_invalid'))
      .optional()
      .or(z.literal('')),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface ZoneFormModalProps {
  open: boolean;
  onClose: () => void;
  standId: string;
}

export function ZoneFormModal({ open, onClose, standId }: ZoneFormModalProps) {
  const createZone = useCreateZone();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) form.reset({ name: '', colorHex: '#4F46E5' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createZone.mutateAsync({ standId, name: values.name, colorHex: values.colorHex || undefined });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={t('venues.form.new_zone')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('ui.name')}
          placeholder={t('venues.form.zone_name_placeholder')}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <div className="flex items-end gap-3">
          <Input
            label={t('venues.form.zone_color_label')}
            placeholder="#4F46E5"
            error={form.formState.errors.colorHex?.message}
            {...form.register('colorHex')}
          />
          <input
            type="color"
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 dark:border-slate-700"
            value={form.watch('colorHex') || '#4F46E5'}
            onChange={(e) => form.setValue('colorHex', e.target.value)}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={createZone.isPending}>
            {t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
