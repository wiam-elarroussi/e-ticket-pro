'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateSubscriptionFormula, useUpdateSubscriptionFormula } from '@/hooks/useSubscriptionFormulas';
import { useVenues } from '@/hooks/useVenues';
import { SubscriptionFormula } from '@/lib/subscription-types';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

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
      name: z.string().min(1).max(150),
      type: z.enum(['SAISON', 'ELIMINATOIRES', 'POULES']),
      venueId: z.string().uuid({ message: t('subscriptions.form.err_select_venue') }),
      price: z.number().min(0, t('subscriptions.form.err_price_positive')),
      validFrom: z.string().min(1, t('subscriptions.form.err_start_required')),
      validTo: z.string().min(1, t('subscriptions.form.err_end_required')),
      globalAccess: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.validFrom && values.validTo && new Date(values.validTo) <= new Date(values.validFrom)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: t('subscriptions.form.err_end_after_start') });
      }
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface SubscriptionFormulaFormModalProps {
  open: boolean;
  onClose: () => void;
  formula?: SubscriptionFormula | null;
}

export function SubscriptionFormulaFormModal({ open, onClose, formula }: SubscriptionFormulaFormModalProps) {
  const isEdit = !!formula;
  const createFormula = useCreateSubscriptionFormula();
  const updateFormula = useUpdateSubscriptionFormula();
  const { data: venues } = useVenues();
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        name: formula?.name ?? '',
        type: formula?.type ?? 'SAISON',
        venueId: formula?.venueId ?? '',
        price: formula ? Number(formula.price) : 0,
        validFrom: toDatetimeLocal(formula?.validFrom),
        validTo: toDatetimeLocal(formula?.validTo),
        // Par défaut, une nouvelle formule (type Saison) couvre tous les événements — cas le plus
        // courant ; l'admin peut décocher pour une formule ciblée (éliminatoires/poules) et gérer
        // un calendrier explicite via la liste des événements inclus.
        globalAccess: formula ? formula.globalAccess : true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formula]);

  const isPending = createFormula.isPending || updateFormula.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && formula) {
      await updateFormula.mutateAsync({
        id: formula.id,
        payload: {
          name: values.name,
          price: values.price,
          validFrom: fromDatetimeLocal(values.validFrom),
          validTo: fromDatetimeLocal(values.validTo),
          globalAccess: values.globalAccess,
        },
      });
    } else {
      await createFormula.mutateAsync({
        name: values.name,
        type: values.type,
        venueId: values.venueId,
        price: values.price,
        validFrom: fromDatetimeLocal(values.validFrom),
        validTo: fromDatetimeLocal(values.validTo),
        globalAccess: values.globalAccess,
      });
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('subscriptions.form.edit_formula') : t('subscriptions.form.new_formula')} widthClassName="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label={t('ui.name')} error={form.formState.errors.name?.message} {...form.register('name')} />

        <div className="grid grid-cols-2 gap-4">
          <Select label={t('ui.type')} disabled={isEdit} error={form.formState.errors.type?.message} {...form.register('type')}>
            <option value="SAISON">{t('subscriptions.form.type_season')}</option>
            <option value="ELIMINATOIRES">{t('subscriptions.form.type_playoffs')}</option>
            <option value="POULES">{t('subscriptions.form.type_groups')}</option>
          </Select>
          <Input
            type="number"
            step="0.01"
            min="0"
            label={t('pricing.form.price_mad')}
            error={form.formState.errors.price?.message}
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>

        <Select label={t('subscriptions.form.venue_label')} disabled={isEdit} error={form.formState.errors.venueId?.message} {...form.register('venueId')}>
          <option value="">{t('subscriptions.form.select_venue')}</option>
          {(venues ?? []).map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </Select>

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

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
          <input type="checkbox" className="mt-0.5 rounded border-slate-300 dark:border-slate-700" {...form.register('globalAccess')} />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">{t('subscriptions.form.global_access_label')}</span> {t('subscriptions.form.global_access_desc')}
          </span>
        </label>

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
