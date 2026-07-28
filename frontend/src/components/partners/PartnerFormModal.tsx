'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreatePartner, useUpdatePartner } from '@/hooks/usePartners';
import { Partner } from '@/lib/types';

const schema = z.object({
  companyName: z.string().min(1).max(150),
  contactName: z.string().max(150).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface PartnerFormModalProps {
  open: boolean;
  onClose: () => void;
  partner?: Partner | null;
}

export function PartnerFormModal({ open, onClose, partner }: PartnerFormModalProps) {
  const isEdit = !!partner;
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        companyName: partner?.companyName ?? '',
        contactName: partner?.contactName ?? '',
        email: partner?.email ?? '',
        phone: partner?.phone ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partner]);

  const isPending = createPartner.isPending || updatePartner.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      companyName: values.companyName,
      contactName: values.contactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
    };
    if (isEdit && partner) {
      await updatePartner.mutateAsync({ id: partner.id, payload });
    } else {
      await createPartner.mutateAsync(payload);
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Raison sociale"
          error={form.formState.errors.companyName?.message}
          {...form.register('companyName')}
        />
        <Input label="Contact" error={form.formState.errors.contactName?.message} {...form.register('contactName')} />
        <Input label="Email" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Input label="Téléphone" error={form.formState.errors.phone?.message} {...form.register('phone')} />
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
