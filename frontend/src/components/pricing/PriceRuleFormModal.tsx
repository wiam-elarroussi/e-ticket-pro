'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreatePriceRule, useUpdatePriceRule } from '@/hooks/usePriceRules';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';
import { PriceRule, TicketCategory } from '@/lib/pricing-types';
import { Stand, Zone } from '@/lib/venue-types';

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

const buildSchema = (t: (key: TranslationKey) => string) =>
  z
    .object({
      categoryId: z.string().uuid({ message: t('pricing.form.err_select_category') }),
      scope: z.enum(['EVENT', 'STAND', 'ZONE', 'SEAT']),
      standId: z.string().optional(),
      zoneId: z.string().optional(),
      seatId: z.string().optional(),
      price: z.number().min(0, t('pricing.form.err_price_positive')),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.scope === 'STAND' && !values.standId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['standId'], message: t('pricing.form.err_select_stand') });
      }
      if (values.scope === 'ZONE' && !values.zoneId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: t('pricing.form.err_select_zone') });
      }
      if (values.scope === 'SEAT' && !values.seatId?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['seatId'], message: t('pricing.form.err_enter_seat_id') });
      }
      if (values.validFrom && values.validTo && new Date(values.validTo) <= new Date(values.validFrom)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: t('pricing.form.err_date_after_start') });
      }
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface PriceRuleFormModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  categories: TicketCategory[];
  stands: (Stand & { zones: Zone[] })[];
  rule?: PriceRule | null;
}

export function PriceRuleFormModal({ open, onClose, eventId, categories, stands, rule }: PriceRuleFormModalProps) {
  const isEdit = !!rule;
  const createRule = useCreatePriceRule();
  const updateRule = useUpdatePriceRule();
  const { t } = useI18nStore();
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const scope = form.watch('scope');
  const standId = form.watch('standId');

  useEffect(() => {
    if (open) {
      const parentStandId = rule?.zoneId ? stands.find((s) => s.zones.some((z) => z.id === rule.zoneId))?.id : '';
      form.reset({
        categoryId: rule?.categoryId ?? '',
        scope: rule?.scope ?? 'EVENT',
        standId: rule?.standId ?? parentStandId ?? '',
        zoneId: rule?.zoneId ?? '',
        seatId: rule?.seatId ?? '',
        price: rule ? Number(rule.price) : 0,
        validFrom: toDatetimeLocal(rule?.validFrom),
        validTo: toDatetimeLocal(rule?.validTo),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  const zonesForStand = stands.find((s) => s.id === standId)?.zones ?? [];
  const isPending = createRule.isPending || updateRule.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && rule) {
      await updateRule.mutateAsync({
        id: rule.id,
        payload: {
          price: values.price,
          validFrom: values.validFrom ? fromDatetimeLocal(values.validFrom) : undefined,
          validTo: values.validTo ? fromDatetimeLocal(values.validTo) : undefined,
        },
      });
    } else {
      await createRule.mutateAsync({
        eventId,
        categoryId: values.categoryId,
        scope: values.scope,
        standId: values.scope === 'STAND' ? values.standId : undefined,
        zoneId: values.scope === 'ZONE' ? values.zoneId : undefined,
        seatId: values.scope === 'SEAT' ? values.seatId : undefined,
        price: values.price,
        validFrom: values.validFrom ? fromDatetimeLocal(values.validFrom) : undefined,
        validTo: values.validTo ? fromDatetimeLocal(values.validTo) : undefined,
      });
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('pricing.form.edit_rule') : t('pricing.form.new_rule')}
      widthClassName="max-w-xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select
          label={t('pricing.form.category')}
          disabled={isEdit}
          error={form.formState.errors.categoryId?.message}
          {...form.register('categoryId')}
        >
          <option value="">{t('pricing.form.select_category')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          label={t('quotas.form.scope')}
          disabled={isEdit}
          error={form.formState.errors.scope?.message}
          {...form.register('scope')}
        >
          <option value="EVENT">{t('pricing.form.scope_event_default')}</option>
          <option value="STAND">{t('quotas.form.scope_stand')}</option>
          <option value="ZONE">{t('quotas.form.scope_zone')}</option>
          <option value="SEAT">{t('pricing.form.scope_seat')}</option>
        </Select>

        {scope === 'STAND' && (
          <Select label={t('quotas.form.stand')} error={form.formState.errors.standId?.message} {...form.register('standId')}>
            <option value="">{t('pricing.form.select_stand')}</option>
            {stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        {scope === 'ZONE' && (
          <>
            <Select label={t('quotas.form.stand')} disabled={isEdit} value={standId} onChange={(e) => form.setValue('standId', e.target.value)}>
              <option value="">{t('pricing.form.select_stand')}</option>
              {stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label={t('quotas.form.zone')} disabled={isEdit} error={form.formState.errors.zoneId?.message} {...form.register('zoneId')}>
              <option value="">{t('pricing.form.select_zone')}</option>
              {zonesForStand.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {scope === 'SEAT' && (
          <Input
            label={t('pricing.form.seat_id')}
            placeholder="UUID"
            disabled={isEdit}
            error={form.formState.errors.seatId?.message}
            {...form.register('seatId')}
          />
        )}

        <Input
          type="number"
          step="0.01"
          min="0"
          label={t('pricing.form.price_mad')}
          error={form.formState.errors.price?.message}
          {...form.register('price', { valueAsNumber: true })}
        />

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('pricing.form.validity_window')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label={t('pricing.form.valid_from')}
              error={form.formState.errors.validFrom?.message}
              {...form.register('validFrom')}
            />
            <Input
              type="datetime-local"
              label={t('pricing.form.valid_to')}
              error={form.formState.errors.validTo?.message}
              {...form.register('validTo')}
            />
          </div>
        </div>

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

