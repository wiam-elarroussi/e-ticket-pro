'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { useVenueFullTree } from '@/hooks/useVenues';
import { Subscription } from '@/lib/subscription-types';
import { useI18nStore } from '@/store/i18n-store';

const schema = z.object({
  holderName: z.string().min(1).max(150),
  holderEmail: z.string().email().max(150).optional().or(z.literal('')),
  holderPhone: z.string().max(30).optional().or(z.literal('')),
  nfcTagId: z.string().max(100).optional().or(z.literal('')),
  standId: z.string().optional().or(z.literal('')),
  zoneId: z.string().optional().or(z.literal('')),
  rowId: z.string().optional().or(z.literal('')),
  seatId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']),
});

type FormValues = z.infer<typeof schema>;

interface SubscriptionFormModalProps {
  open: boolean;
  onClose: () => void;
  formulaId: string;
  venueId: string;
  subscription?: Subscription | null;
}

export function SubscriptionFormModal({ open, onClose, formulaId, venueId, subscription }: SubscriptionFormModalProps) {
  const isEdit = !!subscription;
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const { data: venue } = useVenueFullTree(venueId);
  const t = useI18nStore((s) => s.t);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const standId = form.watch('standId');
  const zoneId = form.watch('zoneId');
  const rowId = form.watch('rowId');

  const [seatSearchDone, setSeatSearchDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setSeatSearchDone(false);
      return;
    }

    // Retrouve la tribune/zone/rang du siège déjà enregistré, pour pré-remplir
    // les listes en cascade (l'API ne stocke que l'UUID du siège).
    let ancestry = { standId: '', zoneId: '', rowId: '' };
    if (subscription?.seatId && venue) {
      for (const s of venue.stands) {
        for (const z of s.zones) {
          for (const r of z.rows ?? []) {
            if ((r.seats ?? []).some((seat) => seat.id === subscription.seatId)) {
              ancestry = { standId: s.id, zoneId: z.id, rowId: r.id };
            }
          }
        }
      }
      setSeatSearchDone(true);
    } else if (!subscription?.seatId) {
      setSeatSearchDone(true);
    }

    form.reset({
      holderName: subscription?.holderName ?? '',
      holderEmail: subscription?.holderEmail ?? '',
      holderPhone: subscription?.holderPhone ?? '',
      nfcTagId: subscription?.nfcTagId ?? '',
      status: subscription?.status ?? 'ACTIVE',
      standId: ancestry.standId,
      zoneId: ancestry.zoneId,
      rowId: ancestry.rowId,
      seatId: subscription?.seatId ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subscription, venue]);

  const stands = venue?.stands ?? [];
  const zones = stands.find((s) => s.id === standId)?.zones ?? [];
  const rows = zones.find((z) => z.id === zoneId)?.rows ?? [];
  const seats = rows.find((r) => r.id === rowId)?.seats ?? [];

  const isPending = createSubscription.isPending || updateSubscription.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const shared = {
      holderName: values.holderName,
      holderEmail: values.holderEmail || undefined,
      holderPhone: values.holderPhone || undefined,
      nfcTagId: values.nfcTagId || undefined,
      seatId: values.seatId || undefined,
    };
    if (isEdit && subscription) {
      await updateSubscription.mutateAsync({ id: subscription.id, payload: { ...shared, status: values.status } });
    } else {
      await createSubscription.mutateAsync({ formulaId, ...shared });
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('subscriptions.form.edit_subscription') : t('subscriptions.form.new_subscription_card')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isEdit && subscription && (
          <Input label={t('subscriptions.form.subscription_id')} value={subscription.id} disabled readOnly className="font-mono text-xs" />
        )}

        <Input label={t('subscriptions.form.holder_name')} error={form.formState.errors.holderName?.message} {...form.register('holderName')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('ui.email')} error={form.formState.errors.holderEmail?.message} {...form.register('holderEmail')} />
          <Input label={t('subscriptions.form.holder_phone')} error={form.formState.errors.holderPhone?.message} {...form.register('holderPhone')} />
        </div>

        <Input
          label={t('subscriptions.form.nfc_id')}
          placeholder={t('subscriptions.form.nfc_placeholder')}
          error={form.formState.errors.nfcTagId?.message}
          {...form.register('nfcTagId')}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{t('subscriptions.form.nominative_seat')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={standId}
              disabled={!seatSearchDone}
              onChange={(e) => {
                form.setValue('standId', e.target.value);
                form.setValue('zoneId', '');
                form.setValue('rowId', '');
                form.setValue('seatId', '');
              }}
            >
              <option value="">{t('subscriptions.form.stand_placeholder')}</option>
              {stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              value={zoneId}
              disabled={!standId}
              onChange={(e) => {
                form.setValue('zoneId', e.target.value);
                form.setValue('rowId', '');
                form.setValue('seatId', '');
              }}
            >
              <option value="">{t('subscriptions.form.zone_placeholder')}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
            <Select
              value={rowId}
              disabled={!zoneId}
              onChange={(e) => {
                form.setValue('rowId', e.target.value);
                form.setValue('seatId', '');
              }}
            >
              <option value="">{t('subscriptions.form.row_placeholder')}</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Select value={form.watch('seatId')} disabled={!rowId} {...form.register('seatId')}>
              <option value="">{t('subscriptions.form.seat_placeholder')}</option>
              {seats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.label ?? `${t('subscriptions.form.seat_label')} ${seat.number}`}
                </option>
              ))}
            </Select>
          </div>
          {form.watch('seatId') && (
            <p className="mt-1 text-xs text-slate-400">
              {t('subscriptions.form.current_selection')}{' '}
              {stands.find((s) => s.id === standId)?.name} · {zones.find((z) => z.id === zoneId)?.name} ·{' '}
              {rows.find((r) => r.id === rowId)?.label} ·{' '}
              {seats.find((seat) => seat.id === form.watch('seatId'))?.label ?? ''}
            </p>
          )}
        </div>

        {isEdit && (
          <Select label={t('ui.status')} error={form.formState.errors.status?.message} {...form.register('status')}>
            <option value="ACTIVE">{t('ui.active')}</option>
            <option value="SUSPENDED">{t('subscriptions.form.status_suspended')}</option>
            <option value="CANCELLED">{t('subscriptions.form.status_cancelled')}</option>
          </Select>
        )}
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
