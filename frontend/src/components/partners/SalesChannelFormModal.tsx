'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSalesChannel } from '@/hooks/useSalesChannels';
import { salesChannelTypeLabels as typeLabels } from '@/lib/sales-channel';

const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(['LOCAL_POS', 'REMOTE_POS', 'WEB', 'PARTNER_API']),
  salesWindowStart: z.string().regex(TIME_RULE, 'Format HH:mm').optional().or(z.literal('')),
  salesWindowEnd: z.string().regex(TIME_RULE, 'Format HH:mm').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface SalesChannelFormModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
}

export function SalesChannelFormModal({ open, onClose, partnerId }: SalesChannelFormModalProps) {
  const createChannel = useCreateSalesChannel();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({ name: '', type: 'REMOTE_POS', salesWindowStart: '', salesWindowEnd: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createChannel.mutateAsync({
      partnerId,
      name: values.name,
      type: values.type,
      salesWindowStart: values.salesWindowStart || undefined,
      salesWindowEnd: values.salesWindowEnd || undefined,
    });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouveau canal de vente">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Nom" error={form.formState.errors.name?.message} {...form.register('name')} />
        <Select label="Type" error={form.formState.errors.type?.message} {...form.register('type')}>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Plage horaire — début"
            placeholder="08:00"
            error={form.formState.errors.salesWindowStart?.message}
            {...form.register('salesWindowStart')}
          />
          <Input
            label="Plage horaire — fin"
            placeholder="20:00"
            error={form.formState.errors.salesWindowEnd?.message}
            {...form.register('salesWindowEnd')}
          />
        </div>
        <p className="text-xs text-slate-400">Laissez vide pour une vente autorisée 24h/24.</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={createChannel.isPending}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
