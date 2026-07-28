'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreatePriceRule, useUpdatePriceRule } from '@/hooks/usePriceRules';
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

const schema = z
  .object({
    categoryId: z.string().uuid({ message: 'Choisissez une catégorie' }),
    scope: z.enum(['EVENT', 'STAND', 'ZONE', 'SEAT']),
    standId: z.string().optional(),
    zoneId: z.string().optional(),
    seatId: z.string().optional(),
    price: z.number().min(0, 'Le prix doit être positif ou nul'),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.scope === 'STAND' && !values.standId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['standId'], message: 'Choisissez une tribune' });
    }
    if (values.scope === 'ZONE' && !values.zoneId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: 'Choisissez une zone' });
    }
    if (values.scope === 'SEAT' && !values.seatId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['seatId'], message: "Renseignez l'identifiant du siège" });
    }
    if (values.validFrom && values.validTo && new Date(values.validTo) <= new Date(values.validFrom)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: 'Doit être postérieure au début' });
    }
  });

type FormValues = z.infer<typeof schema>;

interface PriceRuleFormModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  categories: TicketCategory[];
  stands: (Stand & { zones: Zone[] })[];
  /** Édition : seuls le prix et la fenêtre de validité sont modifiables (portée/cible/catégorie figées). */
  rule?: PriceRule | null;
}

export function PriceRuleFormModal({ open, onClose, eventId, categories, stands, rule }: PriceRuleFormModalProps) {
  const isEdit = !!rule;
  const createRule = useCreatePriceRule();
  const updateRule = useUpdatePriceRule();

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
      title={isEdit ? 'Modifier la règle tarifaire' : 'Nouvelle règle tarifaire'}
      widthClassName="max-w-xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select
          label="Catégorie"
          disabled={isEdit}
          error={form.formState.errors.categoryId?.message}
          {...form.register('categoryId')}
        >
          <option value="">Choisir une catégorie…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="Portée"
          disabled={isEdit}
          error={form.formState.errors.scope?.message}
          {...form.register('scope')}
        >
          <option value="EVENT">Tout l’événement (tarif par défaut)</option>
          <option value="STAND">Une tribune</option>
          <option value="ZONE">Une zone</option>
          <option value="SEAT">Un siège individuel</option>
        </Select>

        {scope === 'STAND' && (
          <Select label="Tribune" error={form.formState.errors.standId?.message} {...form.register('standId')}>
            <option value="">Choisir une tribune…</option>
            {stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        {scope === 'ZONE' && (
          <>
            <Select label="Tribune" disabled={isEdit} value={standId} onChange={(e) => form.setValue('standId', e.target.value)}>
              <option value="">Choisir une tribune…</option>
              {stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label="Zone" disabled={isEdit} error={form.formState.errors.zoneId?.message} {...form.register('zoneId')}>
              <option value="">Choisir une zone…</option>
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
            label="Identifiant du siège"
            placeholder="UUID du siège"
            disabled={isEdit}
            error={form.formState.errors.seatId?.message}
            {...form.register('seatId')}
          />
        )}

        <Input
          type="number"
          step="0.01"
          min="0"
          label="Prix (MAD)"
          error={form.formState.errors.price?.message}
          {...form.register('price', { valueAsNumber: true })}
        />

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Fenêtre de validité (optionnel — tarification dynamique par période)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Valide à partir de"
              error={form.formState.errors.validFrom?.message}
              {...form.register('validFrom')}
            />
            <Input
              type="datetime-local"
              label="Valide jusqu'à"
              error={form.formState.errors.validTo?.message}
              {...form.register('validTo')}
            />
          </div>
        </div>

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
