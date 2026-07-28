'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateZone } from '@/hooks/useZones';

const schema = z.object({
  name: z.string().min(1).max(100),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6,8}$/, 'Couleur hex invalide (ex: #4F46E5)')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface ZoneFormModalProps {
  open: boolean;
  onClose: () => void;
  standId: string;
}

export function ZoneFormModal({ open, onClose, standId }: ZoneFormModalProps) {
  const createZone = useCreateZone();
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
    <Modal open={open} onClose={onClose} title="Nouvelle zone">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nom"
          placeholder="Secteur B12"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <div className="flex items-end gap-3">
          <Input
            label="Couleur (plan 2D)"
            placeholder="#4F46E5"
            error={form.formState.errors.colorHex?.message}
            {...form.register('colorHex')}
          />
          <input
            type="color"
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300"
            value={form.watch('colorHex') || '#4F46E5'}
            onChange={(e) => form.setValue('colorHex', e.target.value)}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={createZone.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
