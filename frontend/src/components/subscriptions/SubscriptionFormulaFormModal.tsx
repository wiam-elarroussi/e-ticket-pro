'use client';

import { useEffect } from 'react';
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
    type: z.enum(['SAISON', 'ELIMINATOIRES', 'POULES']),
    venueId: z.string().uuid({ message: 'Choisissez une enceinte' }),
    price: z.number().min(0, 'Le prix doit être positif ou nul'),
    validFrom: z.string().min(1, 'Date de début requise'),
    validTo: z.string().min(1, 'Date de fin requise'),
    globalAccess: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && new Date(values.validTo) <= new Date(values.validFrom)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: 'Doit être postérieure au début' });
    }
  });

type FormValues = z.infer<typeof schema>;

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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier la formule' : 'Nouvelle formule d’abonnement'} widthClassName="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Nom" error={form.formState.errors.name?.message} {...form.register('name')} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Type" disabled={isEdit} error={form.formState.errors.type?.message} {...form.register('type')}>
            <option value="SAISON">Saison</option>
            <option value="ELIMINATOIRES">Éliminatoires</option>
            <option value="POULES">Poules</option>
          </Select>
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Prix (MAD)"
            error={form.formState.errors.price?.message}
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>

        <Select label="Enceinte" disabled={isEdit} error={form.formState.errors.venueId?.message} {...form.register('venueId')}>
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

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <input type="checkbox" className="mt-0.5 rounded border-slate-300" {...form.register('globalAccess')} />
          <span className="text-sm text-slate-700">
            <span className="font-medium">Accès global</span> — donne accès à tous les événements de l’enceinte,
            sans avoir à gérer un calendrier. Décochez pour restreindre cette formule à une liste explicite
            d’événements (onglet « Calendrier inclus »).
          </span>
        </label>

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
