'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { Event } from '@/lib/event-types';

/** L'input HTML datetime-local n'a pas de fuseau : new Date(...) l'interprète en heure locale, ce qui est le comportement voulu (heure du match, pas UTC). */
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
    name: z.string().min(1).max(150),
    type: z.enum(['MATCH', 'COMPETITION', 'SHOW']),
    homeTeam: z.string().max(100).optional().or(z.literal('')),
    awayTeam: z.string().max(100).optional().or(z.literal('')),
    venueId: z.string().uuid({ message: 'Choisissez une enceinte' }),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
    startAt: z.string().min(1, 'Date de début requise'),
    endAt: z.string().min(1, 'Date de fin requise'),
    salesOpenAt: z.string().optional().or(z.literal('')),
    salesCloseAt: z.string().optional().or(z.literal('')),
    maxPerOrder: z.union([z.number().int().min(1), z.nan()]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.startAt && values.endAt && new Date(values.endAt) <= new Date(values.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'Doit être postérieure au début' });
    }
    if (
      values.salesOpenAt &&
      values.salesCloseAt &&
      new Date(values.salesCloseAt) <= new Date(values.salesOpenAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salesCloseAt'],
        message: 'Doit être postérieure à l’ouverture',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  event?: Event | null;
}

export function EventFormModal({ open, onClose, event }: EventFormModalProps) {
  const isEdit = !!event;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: venues } = useVenues();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const type = form.watch('type');

  useEffect(() => {
    if (open) {
      form.reset({
        name: event?.name ?? '',
        type: event?.type ?? 'MATCH',
        homeTeam: event?.homeTeam ?? '',
        awayTeam: event?.awayTeam ?? '',
        venueId: event?.venueId ?? '',
        status: event?.status ?? 'DRAFT',
        startAt: toDatetimeLocal(event?.startAt),
        endAt: toDatetimeLocal(event?.endAt),
        salesOpenAt: toDatetimeLocal(event?.salesOpenAt),
        salesCloseAt: toDatetimeLocal(event?.salesCloseAt),
        maxPerOrder: event?.maxPerOrder ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const isPending = createEvent.isPending || updateEvent.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      type: values.type,
      homeTeam: values.homeTeam || undefined,
      awayTeam: values.awayTeam || undefined,
      venueId: values.venueId,
      status: values.status,
      startAt: fromDatetimeLocal(values.startAt),
      endAt: fromDatetimeLocal(values.endAt),
      salesOpenAt: values.salesOpenAt ? fromDatetimeLocal(values.salesOpenAt) : undefined,
      salesCloseAt: values.salesCloseAt ? fromDatetimeLocal(values.salesCloseAt) : undefined,
      maxPerOrder: values.maxPerOrder === undefined || Number.isNaN(values.maxPerOrder) ? undefined : values.maxPerOrder,
    };
    if (isEdit && event) {
      await updateEvent.mutateAsync({ id: event.id, payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier l’événement' : 'Nouvel événement'} widthClassName="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Nom" error={form.formState.errors.name?.message} {...form.register('name')} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Type" error={form.formState.errors.type?.message} {...form.register('type')}>
            <option value="MATCH">Match</option>
            <option value="COMPETITION">Compétition</option>
            <option value="SHOW">Spectacle</option>
          </Select>
          <Select label="Statut" error={form.formState.errors.status?.message} {...form.register('status')}>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="CANCELLED">Annulé</option>
          </Select>
        </div>

        {type === 'MATCH' && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Équipe domicile" error={form.formState.errors.homeTeam?.message} {...form.register('homeTeam')} />
            <Input label="Équipe visiteuse" error={form.formState.errors.awayTeam?.message} {...form.register('awayTeam')} />
          </div>
        )}

        <Select label="Enceinte" error={form.formState.errors.venueId?.message} {...form.register('venueId')}>
          <option value="">Choisir une enceinte…</option>
          {(venues ?? []).map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Début"
            error={form.formState.errors.startAt?.message}
            {...form.register('startAt')}
          />
          <Input
            type="datetime-local"
            label="Fin"
            error={form.formState.errors.endAt?.message}
            {...form.register('endAt')}
          />
        </div>

        <Input
          type="number"
          min="1"
          label="Max billets par panier (optionnel)"
          placeholder="Laisser vide pour aucune limite"
          error={form.formState.errors.maxPerOrder?.message}
          {...form.register('maxPerOrder', { valueAsNumber: true })}
        />

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Fenêtre de vente (optionnel)</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Ouverture des ventes"
              error={form.formState.errors.salesOpenAt?.message}
              {...form.register('salesOpenAt')}
            />
            <Input
              type="datetime-local"
              label="Fermeture des ventes"
              error={form.formState.errors.salesCloseAt?.message}
              {...form.register('salesCloseAt')}
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
