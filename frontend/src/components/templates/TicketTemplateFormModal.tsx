'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTicketTemplate } from '@/hooks/useTicketTemplates';

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(255).optional().or(z.literal('')),
  width: z.number().int().min(50).max(2000),
  height: z.number().int().min(50).max(2000),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale (ex: #0f172a)'),
});

type FormValues = z.infer<typeof schema>;

interface TicketTemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function TicketTemplateFormModal({ open, onClose, onCreated }: TicketTemplateFormModalProps) {
  const createTemplate = useCreateTicketTemplate();
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
    <Modal open={open} onClose={onClose} title="Nouveau gabarit de billet">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Nom" error={form.formState.errors.name?.message} {...form.register('name')} />
        <Input label="Description (optionnel)" error={form.formState.errors.description?.message} {...form.register('description')} />
        <div className="grid grid-cols-3 gap-4">
          <Input
            type="number"
            label="Largeur (px)"
            error={form.formState.errors.width?.message}
            {...form.register('width', { valueAsNumber: true })}
          />
          <Input
            type="number"
            label="Hauteur (px)"
            error={form.formState.errors.height?.message}
            {...form.register('height', { valueAsNumber: true })}
          />
          <Input
            type="color"
            label="Fond"
            error={form.formState.errors.backgroundColor?.message}
            {...form.register('backgroundColor')}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={createTemplate.isPending}>
            Créer et ouvrir l’éditeur
          </Button>
        </div>
      </form>
    </Modal>
  );
}
