'use client';

import { useEffect } from 'react';
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

const schema = z
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
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['standId'], message: 'Choisissez une tribune' });
    }
    if (values.scope === 'ZONE' && !values.zoneId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: 'Choisissez une zone' });
    }
    if (values.scope === 'CHANNEL' && !values.channelId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['channelId'], message: 'Choisissez un canal de vente' });
    }
  });

type FormValues = z.infer<typeof schema>;

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
    <Modal open={open} onClose={onClose} title="Nouvelle jauge de vente" widthClassName="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select label="Portée" error={form.formState.errors.scope?.message} {...form.register('scope')}>
          <option value="EVENT">Tout l’événement</option>
          <option value="STAND">Une tribune</option>
          <option value="ZONE">Une zone</option>
          <option value="CHANNEL">Un canal de vente / guichet</option>
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
            <Select label="Tribune" value={standId} onChange={(e) => form.setValue('standId', e.target.value)}>
              <option value="">Choisir une tribune…</option>
              {stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label="Zone" error={form.formState.errors.zoneId?.message} {...form.register('zoneId')}>
              <option value="">Choisir une zone…</option>
              {zonesForStand.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {scope === 'CHANNEL' && (
          <Select label="Canal de vente" error={form.formState.errors.channelId?.message} {...form.register('channelId')}>
            <option value="">Choisir un canal…</option>
            {(channels ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        <Select label="Catégorie (optionnel)" {...form.register('categoryId')}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          type="number"
          min="0"
          label="Plafond de billets (optionnel)"
          placeholder="Laisser vide pour aucune limite chiffrée"
          error={form.formState.errors.maxQuantity?.message}
          {...form.register('maxQuantity', { valueAsNumber: true })}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300" {...form.register('isBlocked')} />
          Bloquer immédiatement la vente sur cette portée
        </label>

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
