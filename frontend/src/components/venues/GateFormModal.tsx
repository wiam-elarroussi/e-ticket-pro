'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateGate } from '@/hooks/useGates';
import { useI18nStore } from '@/store/i18n-store';

const schema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(30).optional().or(z.literal('')),
  description: z.string().max(255).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface GateFormModalProps {
  open: boolean;
  onClose: () => void;
  venueId: string;
}

export function GateFormModal({ open, onClose, venueId }: GateFormModalProps) {
  const createGate = useCreateGate();
  const t = useI18nStore((s) => s.t);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) form.reset({ name: '', code: '', description: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createGate.mutateAsync({
      venueId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
    });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={t('venues.form.new_gate')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label={t('ui.name')} placeholder={t('venues.form.gate_name_placeholder')} error={form.formState.errors.name?.message} {...form.register('name')} />
        <Input label="Code" placeholder={t('venues.form.gate_code_placeholder')} error={form.formState.errors.code?.message} {...form.register('code')} />
        <Input label={t('ui.description')} error={form.formState.errors.description?.message} {...form.register('description')} />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={createGate.isPending}>
            {t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
