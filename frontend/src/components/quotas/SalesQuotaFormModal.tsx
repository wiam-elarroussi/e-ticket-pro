'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSalesQuota } from '@/hooks/useSalesQuotas';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { TicketCategory } from '@/lib/pricing-types';
import { Stand, Zone } from '@/lib/venue-types';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const buildSchema = (t: (key: TranslationKey) => string) =>
  z
    .object({
      scope: z.enum(['EVENT', 'STAND', 'ZONE', 'CHANNEL']),
      standId: z.string().optional(),
      zoneId: z.string().optional(),
      channelId: z.string().optional(),
      categoryId: z.string().optional(),
      maxQuantity: z.union([z.number().int().min(0), z.nan()]).optional(),
      isBlocked: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.scope === 'STAND' && !values.standId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['standId'], message: t('quotas.form.err_choose_stand') });
      }
      if (values.scope === 'ZONE' && !values.zoneId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: t('quotas.form.err_choose_zone') });
      }
      if (values.scope === 'CHANNEL' && !values.channelId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['channelId'], message: t('quotas.form.err_choose_channel') });
      }
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface SalesQuotaFormModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  categories: TicketCategory[];
  stands: (Stand & { zones: Zone[] })[];
}

export function SalesQuotaFormModal({ open, onClose, eventId, categories, stands }: SalesQuotaFormModalProps) {
  const createQuota = useCreateSalesQuota();
  const { data: channels } = useSalesChannels();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const scope = form.watch('scope');
  const standId = form.watch('standId');

  useEffect(() => {
    if (open) {
      form.reset({
        scope: 'EVENT',
        standId: '',
        zoneId: '',
        channelId: '',
        categoryId: '',
        maxQuantity: undefined,
        isBlocked: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const zonesForStand = stands.find((s) => s.id === standId)?.zones ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    await createQuota.mutateAsync({
      eventId,
      scope: values.scope,
      standId: values.scope === 'STAND' ? values.standId : undefined,
      zoneId: values.scope === 'ZONE' ? values.zoneId : undefined,
      channelId: values.scope === 'CHANNEL' ? values.channelId : undefined,
      categoryId: values.categoryId || undefined,
      maxQuantity: values.maxQuantity === undefined || Number.isNaN(values.maxQuantity) ? undefined : values.maxQuantity,
      isBlocked: values.isBlocked,
    });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={t('quotas.form.new_quota')} widthClassName="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select label={t('quotas.form.scope')} error={form.formState.errors.scope?.message} {...form.register('scope')}>
          <option value="EVENT">{t('quotas.form.scope_event')}</option>
          <option value="STAND">{t('quotas.form.scope_stand')}</option>
          <option value="ZONE">{t('quotas.form.scope_zone')}</option>
          <option value="CHANNEL">{t('quotas.form.scope_channel')}</option>
        </Select>

        {scope === 'STAND' && (
          <Select label={t('quotas.form.stand')} error={form.formState.errors.standId?.message} {...form.register('standId')}>
            <option value="">{t('quotas.form.select_stand')}</option>
            {stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        {scope === 'ZONE' && (
          <>
            <Select label={t('quotas.form.stand')} value={standId} onChange={(e) => form.setValue('standId', e.target.value)}>
              <option value="">{t('quotas.form.select_stand')}</option>
              {stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label={t('quotas.form.zone')} error={form.formState.errors.zoneId?.message} {...form.register('zoneId')}>
              <option value="">{t('quotas.form.select_zone')}</option>
              {zonesForStand.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {scope === 'CHANNEL' && (
          <Select label={t('quotas.form.channel')} error={form.formState.errors.channelId?.message} {...form.register('channelId')}>
            <option value="">{t('quotas.form.select_channel')}</option>
            {(channels ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        <Select label={t('quotas.form.category_optional')} {...form.register('categoryId')}>
          <option value="">{t('quotas.form.all_categories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          type="number"
          min="0"
          label={t('quotas.form.max_tickets')}
          placeholder={t('quotas.form.max_tickets_placeholder')}
          error={form.formState.errors.maxQuantity?.message}
          {...form.register('maxQuantity', { valueAsNumber: true })}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" {...form.register('isBlocked')} />
          {t('quotas.form.block_now')}
        </label>

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
