'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateRow } from '@/hooks/useRows';

const schema = z.object({
  label: z.string().min(1).max(50),
  orderIndex: z.number().int().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RowFormModalProps {
  open: boolean;
  onClose: () => void;
  zoneId: string;
}

export function RowFormModal({ open, onClose, zoneId }: RowFormModalProps) {
  const createRow = useCreateRow();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) form.reset({ label: '', orderIndex: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createRow.mutateAsync({ zoneId, label: values.label, orderIndex: values.orderIndex });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouveau rang">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Libellé" placeholder="Rang A" error={form.formState.errors.label?.message} {...form.register('label')} />
        <Input
          type="number"
          label="Ordre d'affichage"
          error={form.formState.errors.orderIndex?.message}
          {...form.register('orderIndex', { valueAsNumber: true })}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={createRow.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
