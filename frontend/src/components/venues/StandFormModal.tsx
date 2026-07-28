'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateStand } from '@/hooks/useStands';

const schema = z.object({
  name: z.string().min(1).max(100),
  orderIndex: z.number().int().optional(),
});

type FormValues = z.infer<typeof schema>;

interface StandFormModalProps {
  open: boolean;
  onClose: () => void;
  venueId: string;
}

export function StandFormModal({ open, onClose, venueId }: StandFormModalProps) {
  const createStand = useCreateStand();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) form.reset({ name: '', orderIndex: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createStand.mutateAsync({ venueId, name: values.name, orderIndex: values.orderIndex });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tribune">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nom"
          placeholder="Tribune Nord"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
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
          <Button type="submit" isLoading={createStand.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
