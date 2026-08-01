'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreatePartner, useUpdatePartner } from '@/hooks/usePartners';
import { useI18nStore } from '@/store/i18n-store';
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
  const { t } = useI18nStore();

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
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('partners.form.edit_partner') : t('partners.form.new_partner')}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('partners.form.company_name')}
          error={form.formState.errors.companyName?.message}
          {...form.register('companyName')}
        />
        <Input
          label={t('partners.form.contact_name')}
          error={form.formState.errors.contactName?.message}
          {...form.register('contactName')}
        />
        <Input
          label={t('ui.email')}
          type="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label={t('partners.form.phone')}
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            {isEdit ? t('ui.save') : t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

