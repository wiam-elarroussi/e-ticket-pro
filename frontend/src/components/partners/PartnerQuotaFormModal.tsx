'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreatePartnerQuota } from '@/hooks/usePartnerQuotas';
import { SalesChannel } from '@/lib/types';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    salesChannelId: z.string().optional().or(z.literal('')),
    maxQuantity: z.number().int().min(1, t('partners.form.err_min_1')),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface PartnerQuotaFormModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  channels: SalesChannel[];
}

export function PartnerQuotaFormModal({ open, onClose, partnerId, channels }: PartnerQuotaFormModalProps) {
  const createQuota = useCreatePartnerQuota();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ salesChannelId: '', maxQuantity: 100 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createQuota.mutateAsync({
      partnerId,
      salesChannelId: values.salesChannelId || undefined,
      maxQuantity: values.maxQuantity,
    });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={t('partners.form.new_quota')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select label={t('partners.form.channel_optional')} {...form.register('salesChannelId')}>
          <option value="">{t('partners.form.all_partner_channels')}</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          label={t('partners.form.max_quantity')}
          error={form.formState.errors.maxQuantity?.message}
          {...form.register('maxQuantity', { valueAsNumber: true })}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={createQuota.isPending}>
            {t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
