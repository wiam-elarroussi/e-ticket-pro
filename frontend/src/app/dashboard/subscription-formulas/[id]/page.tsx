'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useSubscriptionFormula, useSetFormulaIncludedEvents } from '@/hooks/useSubscriptionFormulas';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { SubscriptionFormulaFormModal } from '@/components/subscriptions/SubscriptionFormulaFormModal';
import { SubscriptionFormModal } from '@/components/subscriptions/SubscriptionFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SubscriptionFormulaType, SubscriptionStatus, Subscription } from '@/lib/subscription-types';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function SubscriptionFormulaDetailPage() {
  return (
    <RequirePermission permission="subscriptions:read">
      <SubscriptionFormulaDetailPageContent />
    </RequirePermission>
  );
}

function SubscriptionFormulaDetailPageContent() {
  const params = useParams<{ id: string }>();
  const formulaId = params.id;

  const { data: formula, isLoading, isError, error } = useSubscriptionFormula(formulaId);
  const { data: venueEvents } = useEvents(formula?.venueId);
  const { data: venue } = useVenueFullTree(formula?.venueId ?? '');
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions(formulaId);
  const setIncludedEvents = useSetFormulaIncludedEvents();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [editingFormula, setEditingFormula] = useState(false);
  const [subModal, setSubModal] = useState<{ open: boolean; subscription?: Subscription | null }>({ open: false });

  const canUpdate = hasPermission('subscriptions:update');
  const canCreate = hasPermission('subscriptions:create');

  const typeLabels: Record<SubscriptionFormulaType, string> = {
    SAISON: t('subscriptions.detail.type_full_season'),
    ELIMINATOIRES: t('subscriptions.detail.type_knockout'),
    POULES: t('subscriptions.detail.type_group_stage'),
  };

  const statusBadge: Record<SubscriptionStatus, { label: string; tone: 'green' | 'amber' | 'red' }> = {
    ACTIVE: { label: t('ui.active'), tone: 'green' },
    SUSPENDED: { label: t('subscriptions.form.status_suspended'), tone: 'amber' },
    CANCELLED: { label: t('subscriptions.form.status_cancelled'), tone: 'red' },
  };

  useEffect(() => {
    if (formula?.includedEvents) {
      setSelectedEventIds(new Set(formula.includedEvents.map((e) => e.eventId)));
    }
  }, [formula?.includedEvents]);

  const initialEventIds = new Set(formula?.includedEvents?.map((e) => e.eventId) ?? []);
  const hasChanges =
    selectedEventIds.size !== initialEventIds.size ||
    Array.from(selectedEventIds).some((id) => !initialEventIds.has(id));

  const seatLabel = (seatId: string | null) => {
    if (!seatId || !venue) return seatId ?? '—';
    for (const s of venue.stands) {
      for (const z of s.zones) {
        for (const r of z.rows ?? []) {
          const seat = (r.seats ?? []).find((se) => se.id === seatId);
          if (seat) return `${s.name} · ${z.name} · ${r.label} · ${seat.label ?? `${t('templates.generate.seat_label_prefix')} ${seat.number}`}`;
        }
      }
    }
    return seatId;
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-[#00875A]" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `${t('subscriptions.detail.error_loading')}: ${error.message}`
            : t('subscriptions.detail.error_loading_generic')
        }
      />
    );
  }

  if (!formula) {
    return <EmptyState message={t('subscriptions.detail.not_found')} />;
  }

  return (
    <div>
      <Link
        href="/dashboard/subscription-formulas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('subscriptions.detail.back_to_formulas')}
      </Link>

      <div className="mb-6 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{formula.name}</h1>
          <Badge tone="indigo">{typeLabels[formula.type]}</Badge>
          {formula.globalAccess && (
            <Badge tone="green">
              {t('subscriptions.detail.global_access_badge')}
            </Badge>
          )}
          {canUpdate && (
            <Button variant="ghost" onClick={() => setEditingFormula(true)} title={t('ui.edit')}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p>
            <span className="text-slate-400">{t('subscriptions.detail.price_label')} </span>
            {priceFormatter.format(Number(formula.price))}
          </p>
          <p>
            <span className="text-slate-400">{t('subscriptions.detail.validity_label')} </span>
            {dateFormatter.format(new Date(formula.validFrom))} → {dateFormatter.format(new Date(formula.validTo))}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <h2 className="font-medium text-slate-900 dark:text-white">{t('subscriptions.detail.included_calendar')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formula.globalAccess
            ? t('subscriptions.detail.global_access_active_desc')
            : t('subscriptions.detail.calendar_desc')}
        </p>
      </div>

      {!venueEvents?.length ? (
        <EmptyState message={t('subscriptions.detail.no_event_scheduled')} />
      ) : (
        <div className="mb-6 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {venueEvents.map((event) => (
              <label key={event.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700 text-[#00875A]"
                  disabled={!canUpdate}
                  checked={selectedEventIds.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                />
                <span className="text-slate-700 dark:text-slate-300">{event.name}</span>
                <span className="text-xs text-slate-400">{dateFormatter.format(new Date(event.startAt))}</span>
              </label>
            ))}
          </div>
          {canUpdate && (
            <div className="mt-3 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
              <Button
                disabled={!hasChanges}
                isLoading={setIncludedEvents.isPending}
                onClick={() => setIncludedEvents.mutate({ id: formulaId, eventIds: Array.from(selectedEventIds) })}
                className="bg-[#00875A] text-white hover:bg-[#00754e]"
              >
                {t('subscriptions.detail.save_calendar')}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-900 dark:text-white">{t('subscriptions.detail.subscriber_cards')}</h2>
        {canCreate && (
          <Button onClick={() => setSubModal({ open: true, subscription: null })} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('subscriptions.detail.new_card')}</span>
          </Button>
        )}
      </div>

      {subsLoading ? (
        <Spinner className="h-5 w-5 text-[#00875A]" />
      ) : !subscriptions?.length ? (
        <EmptyState message={t('subscriptions.detail.no_cards_issued')} />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('subscriptions.detail.th_holder')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('subscriptions.detail.th_contact')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('subscriptions.detail.th_assigned_seat')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('ui.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{sub.holderName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{sub.holderEmail ?? sub.holderPhone ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{seatLabel(sub.seatId)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusBadge[sub.status].tone}>{statusBadge[sub.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate && (
                        <div className="flex justify-end">
                          <Button variant="ghost" onClick={() => setSubModal({ open: true, subscription: sub })} title={t('ui.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubscriptionFormulaFormModal open={editingFormula} onClose={() => setEditingFormula(false)} formula={formula} />

      <SubscriptionFormModal
        open={subModal.open}
        onClose={() => setSubModal({ open: false })}
        formulaId={formulaId}
        venueId={formula.venueId}
        subscription={subModal.subscription}
      />
    </div>
  );
}

