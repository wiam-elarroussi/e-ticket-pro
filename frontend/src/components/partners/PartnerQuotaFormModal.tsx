'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreatePartnerQuota } from '@/hooks/usePartnerQuotas';
import { SalesChannel } from '@/lib/types';

const schema = z.object({
  salesChannelId: z.string().optional().or(z.literal('')),
  maxQuantity: z.number().int().min(1, 'Doit être ≥ 1'),
});

type FormValues = z.infer<typeof schema>;

interface PartnerQuotaFormModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  channels: SalesChannel[];
}

export function PartnerQuotaFormModal({ open, onClose, partnerId, channels }: PartnerQuotaFormModalProps) {
  const createQuota = useCreatePartnerQuota();
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
    <Modal open={open} onClose={onClose} title="Nouveau quota">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select label="Canal de vente (optionnel)" {...form.register('salesChannelId')}>
          <option value="">Tous les canaux du partenaire</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          label="Quantité maximale"
          error={form.formState.errors.maxQuantity?.message}
          {...form.register('maxQuantity', { valueAsNumber: true })}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={createQuota.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
