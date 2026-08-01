'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useGenerateSeats } from '@/hooks/useRows';
import { Row } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

const schema = z.object({
  count: z.number().int().min(1).max(500),
  startNumber: z.number().int().min(0).optional(),
  direction: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']),
  replaceExisting: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface GenerateSeatsModalProps {
  open: boolean;
  onClose: () => void;
  row: Row | null;
}

export function GenerateSeatsModal({ open, onClose, row }: GenerateSeatsModalProps) {
  const generateSeats = useGenerateSeats();
  const t = useI18nStore((s) => s.t);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  // "row" peut venir de la liste (avec _count.seats) ou de la zone complète
  // (avec seats[] déjà chargé) selon l'appelant : on couvre les deux formes.
  const hasExistingSeats = (row?.seats?.length ?? row?._count?.seats ?? 0) > 0;

  useEffect(() => {
    if (open) {
      form.reset({ count: 20, startNumber: 1, direction: 'LEFT_TO_RIGHT', replaceExisting: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  if (!row) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    await generateSeats.mutateAsync({
      rowId: row.id,
      payload: {
        count: values.count,
        startNumber: values.startNumber,
        direction: values.direction,
        replaceExisting: values.replaceExisting,
      },
    });
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={`${t('venues.form.generate_seats_title')} — ${row.label}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {hasExistingSeats && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
            {t('venues.form.seats_warning').replace('{count}', String(row.seats?.length ?? row._count?.seats))}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="number"
            label={t('venues.form.seats_count')}
            error={form.formState.errors.count?.message}
            {...form.register('count', { valueAsNumber: true })}
          />
          <Input
            type="number"
            label={t('venues.form.first_number')}
            error={form.formState.errors.startNumber?.message}
            {...form.register('startNumber', { valueAsNumber: true })}
          />
        </div>
        <Select label={t('venues.form.direction_label')} {...form.register('direction')}>
          <option value="LEFT_TO_RIGHT">{t('venues.form.direction_ltr')}</option>
          <option value="RIGHT_TO_LEFT">{t('venues.form.direction_rtl')}</option>
        </Select>
        {hasExistingSeats && (
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700" {...form.register('replaceExisting')} />
            {t('venues.form.replace_existing_seats')}
          </label>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={generateSeats.isPending}>
            {t('venues.form.generate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
