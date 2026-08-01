'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSalesChannel, useUpdateSalesChannel } from '@/hooks/useSalesChannels';
import { usePartners } from '@/hooks/usePartners';
import { getSalesChannelTypeLabels } from '@/lib/sales-channel';
import { SalesChannel } from '@/lib/types';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;

const buildSchema = (t: (key: TranslationKey) => string) =>
  z.object({
    partnerId: z.string().optional().or(z.literal('')),
    name: z.string().min(1).max(150),
    type: z.enum(['LOCAL_POS', 'REMOTE_POS', 'WEB', 'PARTNER_API']),
    salesWindowStart: z.string().regex(TIME_RULE, t('partners.form.err_time_format')).optional().or(z.literal('')),
    salesWindowEnd: z.string().regex(TIME_RULE, t('partners.form.err_time_format')).optional().or(z.literal('')),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);
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
    <Modal open={open} onClose={onClose} title={isEdit ? t('partners.form.edit_channel') : t('partners.form.new_channel')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!partnerId && !isEdit && (
          <Select label={t('partners.form.partner')} {...form.register('partnerId')}>
            <option value="">{t('partners.form.no_partner_internal')}</option>
            {(partners ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
              </option>
            ))}
          </Select>
        )}
        <Input label={t('ui.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
        <Select label={t('ui.type')} error={form.formState.errors.type?.message} {...form.register('type')}>
          {Object.entries(getSalesChannelTypeLabels(t)).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('partners.form.time_window_start')}
            placeholder="08:00"
            error={form.formState.errors.salesWindowStart?.message}
            {...form.register('salesWindowStart')}
          />
          <Input
            label={t('partners.form.time_window_end')}
            placeholder="20:00"
            error={form.formState.errors.salesWindowEnd?.message}
            {...form.register('salesWindowEnd')}
          />
        </div>
        <p className="text-xs text-slate-400">{t('partners.form.time_window_hint')}</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? t('ui.save') : t('ui.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
