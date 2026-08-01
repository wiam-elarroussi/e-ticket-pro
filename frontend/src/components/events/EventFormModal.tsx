'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';
import { Event } from '@/lib/event-types';
import { uploadEventImage } from '@/api/events';
import { EVENTS_API_URL, ApiError } from '@/lib/api-client';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** L'API renvoie un chemin relatif (/uploads/events/xxx.jpg) : il faut le
 * préfixer par l'origine d'events-service pour l'afficher côté navigateur. */
function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${EVENTS_API_URL}${path}`;
}

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
      type: z.enum(['MATCH', 'COMPETITION', 'SHOW']),
      homeTeam: z.string().max(100).optional().or(z.literal('')),
      awayTeam: z.string().max(100).optional().or(z.literal('')),
      venueId: z.string().uuid({ message: t('events.form.err_select_venue') }),
      status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
      startAt: z.string().min(1, t('events.form.err_start_required')),
      endAt: z.string().min(1, t('events.form.err_end_required')),
      salesOpenAt: z.string().optional().or(z.literal('')),
      salesCloseAt: z.string().optional().or(z.literal('')),
      maxPerOrder: z.union([z.number().int().min(1), z.nan()]).optional(),
    })
    .superRefine((values, ctx) => {
      if (values.startAt && values.endAt && new Date(values.endAt) <= new Date(values.startAt)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: t('events.form.err_end_after_start') });
      }
      if (
        values.salesOpenAt &&
        values.salesCloseAt &&
        new Date(values.salesCloseAt) <= new Date(values.salesOpenAt)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['salesCloseAt'],
          message: t('events.form.err_close_after_open'),
        });
      }
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const { t } = useI18nStore();
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const type = form.watch('type');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCleared, setImageCleared] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (open) {
      setImageFile(null);
      setImageCleared(false);
      setImagePreview(resolveImageUrl(event?.imageUrl));
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

  const isPending = createEvent.isPending || updateEvent.isPending || isUploadingImage;

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('events.form.image_type_error'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t('events.form.image_size_error'));
      return;
    }
    setImageFile(file);
    setImageCleared(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageCleared(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = form.handleSubmit(async (values) => {
    let imageUrl: string | undefined;
    if (imageFile) {
      setIsUploadingImage(true);
      try {
        const result = await uploadEventImage(imageFile);
        imageUrl = result.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t('events.form.image_upload_error'));
        return;
      } finally {
        setIsUploadingImage(false);
      }
    } else if (imageCleared) {
      imageUrl = '';
    }

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
      imageUrl,
    };
    if (isEdit && event) {
      await updateEvent.mutateAsync({ id: event.id, payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('events.form.edit_event') : t('events.form.new_event')}
      widthClassName="max-w-xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('events.form.event_title')}
          placeholder={t('events.form.event_title_placeholder')}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('events.form.image_label')}
          </label>
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <img src={imagePreview} alt="" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-[#00875A] hover:text-[#00875A] transition-colors"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-semibold">{t('events.form.image_placeholder')}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label={t('events.form.event_type')} error={form.formState.errors.type?.message} {...form.register('type')}>
            <option value="MATCH">{t('events.form.type_match')}</option>
            <option value="COMPETITION">{t('events.form.type_competition')}</option>
            <option value="SHOW">{t('events.form.type_show')}</option>
          </Select>
          <Select label={t('events.form.ticketing_status')} error={form.formState.errors.status?.message} {...form.register('status')}>
            <option value="DRAFT">{t('events.form.status_draft')}</option>
            <option value="PUBLISHED">{t('events.form.status_published')}</option>
            <option value="CANCELLED">{t('events.form.status_cancelled')}</option>
          </Select>
        </div>

        {type === 'MATCH' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('events.form.home_team')}
              placeholder="ex: Raja CA"
              error={form.formState.errors.homeTeam?.message}
              {...form.register('homeTeam')}
            />
            <Input
              label={t('events.form.away_team')}
              placeholder="ex: Wydad AC"
              error={form.formState.errors.awayTeam?.message}
              {...form.register('awayTeam')}
            />
          </div>
        )}

        <Select label={t('events.form.venue')} error={form.formState.errors.venueId?.message} {...form.register('venueId')}>
          <option value="">{t('events.form.select_venue_placeholder')}</option>
          {(venues ?? []).map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name} ({venue.city ?? 'Stadium'})
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label={t('events.form.start_datetime')}
            error={form.formState.errors.startAt?.message}
            {...form.register('startAt')}
          />
          <Input
            type="datetime-local"
            label={t('events.form.end_datetime')}
            error={form.formState.errors.endAt?.message}
            {...form.register('endAt')}
          />
        </div>

        <Input
          type="number"
          min="1"
          label={t('events.form.max_per_order')}
          placeholder={t('events.form.max_per_order_placeholder')}
          error={form.formState.errors.maxPerOrder?.message}
          {...form.register('maxPerOrder', { valueAsNumber: true })}
        />

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('events.form.sales_window')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label={t('events.form.sales_open')}
              error={form.formState.errors.salesOpenAt?.message}
              {...form.register('salesOpenAt')}
            />
            <Input
              type="datetime-local"
              label={t('events.form.sales_close')}
              error={form.formState.errors.salesCloseAt?.message}
              {...form.register('salesCloseAt')}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
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


