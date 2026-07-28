'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSalesChannel, useUpdateSalesChannel } from '@/hooks/useSalesChannels';
import { usePartners } from '@/hooks/usePartners';
import { salesChannelTypeLabels as typeLabels } from '@/lib/sales-channel';
import { SalesChannel } from '@/lib/types';

const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  partnerId: z.string().optional().or(z.literal('')),
  name: z.string().min(1).max(150),
  type: z.enum(['LOCAL_POS', 'REMOTE_POS', 'WEB', 'PARTNER_API']),
  salesWindowStart: z.string().regex(TIME_RULE, 'Format HH:mm').optional().or(z.literal('')),
  salesWindowEnd: z.string().regex(TIME_RULE, 'Format HH:mm').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface SalesChannelFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Si fourni (contexte fiche partenaire), le canal est rattaché à ce partenaire et le sélecteur est masqué.
   * Si absent (contexte page globale "Canaux de vente"), un sélecteur de partenaire est affiché, avec
   * l'option "Aucun (canal interne / guichet)" — un canal de vente n'est pas toujours rattaché à un partenaire. */
  partnerId?: string;
  /** Si fourni, la modale édite ce canal existant au lieu d'en créer un nouveau. */
  channel?: SalesChannel | null;
}

export function SalesChannelFormModal({ open, onClose, partnerId, channel }: SalesChannelFormModalProps) {
  const isEdit = !!channel;
  const createChannel = useCreateSalesChannel();
  const updateChannel = useUpdateSalesChannel();
  const { data: partners } = usePartners();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        partnerId: channel?.partnerId ?? partnerId ?? '',
        name: channel?.name ?? '',
        type: channel?.type ?? 'REMOTE_POS',
        salesWindowStart: channel?.salesWindowStart ? channel.salesWindowStart.slice(11, 16) : '',
        salesWindowEnd: channel?.salesWindowEnd ? channel.salesWindowEnd.slice(11, 16) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel, partnerId]);

  const isPending = createChannel.isPending || updateChannel.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const shared = {
      name: values.name,
      type: values.type,
      salesWindowStart: values.salesWindowStart || undefined,
      salesWindowEnd: values.salesWindowEnd || undefined,
    };
    if (isEdit && channel) {
      await updateChannel.mutateAsync({ id: channel.id, payload: shared });
    } else {
      await createChannel.mutateAsync({ ...shared, partnerId: (partnerId ?? values.partnerId) || undefined });
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le canal de vente' : 'Nouveau canal de vente'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!partnerId && !isEdit && (
          <Select label="Partenaire" {...form.register('partnerId')}>
            <option value="">Aucun (canal interne / guichet)</option>
            {(partners ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
              </option>
            ))}
          </Select>
        )}
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
          <Button type="submit" isLoading={isPending}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
