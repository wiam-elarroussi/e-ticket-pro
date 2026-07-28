'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateVenue, useUpdateVenue } from '@/hooks/useVenues';
import { Venue } from '@/lib/venue-types';

const schema = z.object({
  name: z.string().min(1).max(150),
  city: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface VenueFormModalProps {
  open: boolean;
  onClose: () => void;
  venue?: Venue | null;
}

export function VenueFormModal({ open, onClose, venue }: VenueFormModalProps) {
  const isEdit = !!venue;
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ name: venue?.name ?? '', city: venue?.city ?? '', address: venue?.address ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venue]);

  const isPending = createVenue.isPending || updateVenue.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      city: values.city || undefined,
      address: values.address || undefined,
    };
    if (isEdit && venue) {
      await updateVenue.mutateAsync({ id: venue.id, payload });
    } else {
      await createVenue.mutateAsync(payload);
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier l’enceinte' : 'Nouvelle enceinte'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Nom" error={form.formState.errors.name?.message} {...form.register('name')} />
        <Input label="Ville" error={form.formState.errors.city?.message} {...form.register('city')} />
        <Input label="Adresse" error={form.formState.errors.address?.message} {...form.register('address')} />
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
