'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTicketTemplate } from '@/hooks/useTicketTemplates';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    name: z.string().min(1).max(150),
    description: z.string().max(255).optional().or(z.literal('')),
    width: z.number().int().min(50).max(2000),
    height: z.number().int().min(50).max(2000),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, t('templates.form.color_hex_invalid')),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface TicketTemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function TicketTemplateFormModal({ open, onClose, onCreated }: TicketTemplateFormModalProps) {
  const createTemplate = useCreateTicketTemplate();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ name: '', description: '', width: 600, height: 300, backgroundColor: '#ffffff' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    const created = await createTemplate.mutateAsync({
      name: values.name,
      description: values.description || undefined,
      width: values.width,
      height: values.height,
      backgroundColor: values.backgroundColor,
    });
    onClose();
    onCreated(created.id);
  });

  return (
    <Modal open={open} onClose={onClose} title={t('templates.form.new_template')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label={t('ui.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
        <Input label={t('templates.form.description_optional')} error={form.formState.errors.description?.message} {...form.register('description')} />
        <div className="grid grid-cols-3 gap-4">
          <Input
            type="number"
            label={t('templates.form.width')}
            error={form.formState.errors.width?.message}
            {...form.register('width', { valueAsNumber: true })}
          />
          <Input
            type="number"
            label={t('templates.form.height')}
            error={form.formState.errors.height?.message}
            {...form.register('height', { valueAsNumber: true })}
          />
          <Input
            type="color"
            label={t('templates.form.background')}
            error={form.formState.errors.backgroundColor?.message}
            {...form.register('backgroundColor')}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={createTemplate.isPending}>
            {t('templates.form.create_and_open')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
