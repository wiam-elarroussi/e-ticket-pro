'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus, Trash2, Trophy, Tag, ShieldAlert } from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { useDeletePriceRule, usePriceRules } from '@/hooks/usePriceRules';
import { useDeleteSalesQuota, useSalesQuotas, useSetSalesQuotaStatus } from '@/hooks/useSalesQuotas';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PriceRuleFormModal } from '@/components/pricing/PriceRuleFormModal';
import { SalesQuotaFormModal } from '@/components/quotas/SalesQuotaFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EventType } from '@/lib/event-types';
import { PriceRule } from '@/lib/pricing-types';
import { SalesQuota } from '@/lib/quota-types';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function EventDetailPage() {
  return (
    <RequirePermission permission="events:read">
      <EventDetailPageContent />
    </RequirePermission>
  );
}

function EventDetailPageContent() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const { data: event, isLoading, isError, error } = useEvent(eventId);
  const { data: venue } = useVenueFullTree(event?.venueId ?? '');
  const { data: categories } = useTicketCategories();
  const { data: priceRules, isLoading: rulesLoading } = usePriceRules(eventId);
  const deleteRule = useDeletePriceRule();
  const { data: salesQuotas, isLoading: quotasLoading } = useSalesQuotas(eventId);
  const { data: channels } = useSalesChannels();
  const setQuotaStatus = useSetSalesQuotaStatus();
  const deleteQuota = useDeleteSalesQuota();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [ruleModal, setRuleModal] = useState<{ open: boolean; rule?: PriceRule | null }>({ open: false });
  const [toDelete, setToDelete] = useState<PriceRule | null>(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<SalesQuota | null>(null);

  const canCreateRule = hasPermission('pricing:create');
  const canUpdateRule = hasPermission('pricing:update');
  const canDeleteRule = hasPermission('pricing:delete');
  const canManageQuotas = hasPermission('sales-quotas:manage');
  const canToggleQuotas = hasPermission('sales-quotas:toggle');

  const typeLabels: Record<EventType, string> = {
    MATCH: 'Match',
    COMPETITION: t('events.detail.type_tournament'),
    SHOW: t('events.detail.type_show'),
  };

  const scopeLabels: Record<PriceRule['scope'], string> = {
    EVENT: t('events.detail.scope_entire_event'),
    STAND: t('events.detail.scope_stand'),
    ZONE: t('events.detail.scope_zone'),
    SEAT: t('events.detail.scope_seat'),
  };

  const quotaScopeLabels: Record<SalesQuota['scope'], string> = {
    EVENT: t('events.detail.scope_entire_event'),
    STAND: t('events.detail.scope_stand'),
    ZONE: t('events.detail.scope_zone'),
    CHANNEL: t('events.detail.scope_channel'),
  };

  const stands = venue?.stands ?? [];

  const targetLabel = (rule: PriceRule) => {
    if (rule.scope === 'EVENT') return '—';
    if (rule.scope === 'STAND') return stands.find((s) => s.id === rule.standId)?.name ?? rule.standId;
    if (rule.scope === 'ZONE') {
      for (const stand of stands) {
        const zone = stand.zones.find((z) => z.id === rule.zoneId);
        if (zone) return `${stand.name} / ${zone.name}`;
      }
      return rule.zoneId;
    }
    return rule.seatId;
  };

  const quotaTargetLabel = (quota: SalesQuota) => {
    if (quota.scope === 'EVENT') return '—';
    if (quota.scope === 'STAND') return stands.find((s) => s.id === quota.standId)?.name ?? quota.standId;
    if (quota.scope === 'ZONE') {
      for (const stand of stands) {
        const zone = stand.zones.find((z) => z.id === quota.zoneId);
        if (zone) return `${stand.name} / ${zone.name}`;
      }
      return quota.zoneId;
    }
    return channels?.find((c) => c.id === quota.channelId)?.name ?? quota.channelId;
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
            ? `${t('events.detail.error_loading')}: ${error.message}`
            : t('events.detail.error_loading_generic')
        }
      />
    );
  }

  if (!event) {
    return <EmptyState message={t('events.detail.not_found')} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('events.detail.back_to_list')}</span>
      </Link>

      {/* Carte Fiche Événement */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-[#00875A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
                {t('events.detail.overview_badge')}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{event.name}</h1>
            {event.type === 'MATCH' && event.homeTeam && event.awayTeam && (
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                ⚔️ {event.homeTeam} vs {event.awayTeam}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {event.status === 'PUBLISHED' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                <span className="h-2 w-2 rounded-full bg-[#00875A] animate-pulse" />
                {t('events.status_published_on_sale')}
              </span>
            ) : event.status === 'DRAFT' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                {t('events.status_draft')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                {t('events.status_cancelled')}
              </span>
            )}
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
              {typeLabels[event.type]}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 p-4 text-xs font-medium text-slate-700 dark:text-slate-300 sm:grid-cols-3 border border-slate-200/60 dark:border-slate-800/60">
          <p>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {t('events.detail.stadium_label')}
            </span>
            <strong className="text-slate-900 dark:text-white">{venue?.name ?? '—'}</strong>
          </p>
          <p>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {t('events.detail.start_label')}
            </span>
            <strong className="text-slate-900 dark:text-white">{dateFormatter.format(new Date(event.startAt))}</strong>
          </p>
          <p>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {t('events.detail.max_per_order_label')}
            </span>
            <strong className="text-slate-900 dark:text-white">{event.maxPerOrder ?? 10} {t('events.detail.ticket_count')}</strong>
          </p>
        </div>
      </div>

      {/* Section Grille Tarifaire */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('events.detail.pricing_title')}
            </h2>
          </div>
          {canCreateRule && (
            <Button
              onClick={() => setRuleModal({ open: true, rule: null })}
              disabled={!categories?.length}
              className="bg-[#00875A] text-white hover:bg-[#00754e]"
            >
              <Plus className="h-4 w-4" />
              <span>{t('events.detail.new_price_rule')}</span>
            </Button>
          )}
        </div>

        {rulesLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !priceRules?.length ? (
          <EmptyState message={t('events.detail.no_price_rules')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_ticket_category')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_pricing_scope')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_target')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_unit_price')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_validity_period')}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('ui.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {priceRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">{rule.category?.name ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                          {scopeLabels[rule.scope]}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">{targetLabel(rule)}</td>
                      <td className="px-5 py-4 font-extrabold text-[#00875A] text-base">
                        {priceFormatter.format(Number(rule.price))}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {rule.validFrom || rule.validTo ? (
                          <>
                            {rule.validFrom ? dateFormatter.format(new Date(rule.validFrom)) : '…'}
                            {' → '}
                            {rule.validTo ? dateFormatter.format(new Date(rule.validTo)) : '…'}
                          </>
                        ) : (
                          t('events.detail.permanent_duration')
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canUpdateRule && (
                            <Button variant="ghost" onClick={() => setRuleModal({ open: true, rule })} title={t('ui.edit')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteRule && (
                            <Button variant="ghost" onClick={() => setToDelete(rule)} title={t('ui.delete')}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Section Jauges & Quotas de Vente */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('events.detail.quotas_title')}
            </h2>
          </div>
          {canManageQuotas && (
            <Button onClick={() => setQuotaModalOpen(true)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('events.detail.new_quota')}</span>
            </Button>
          )}
        </div>

        {quotasLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !salesQuotas?.length ? (
          <EmptyState message={t('events.detail.no_quotas')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_quota_scope')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_target_stand_channel')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_allocated_category')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_max_tickets')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.th_sales_status')}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.detail.th_emergency_switch')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesQuotas.map((quota) => (
                    <tr key={quota.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{quotaScopeLabels[quota.scope]}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">{quotaTargetLabel(quota)}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {quota.category?.name ?? t('events.detail.all_categories')}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">
                        {quota.maxQuantity ?? t('events.detail.unlimited')}
                      </td>
                      <td className="px-5 py-4">
                        {quota.isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                            {t('events.detail.quota_blocked')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                            {t('events.detail.quota_open')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canToggleQuotas && (
                            <Button
                              variant="ghost"
                              onClick={() => setQuotaStatus.mutate({ id: quota.id, isBlocked: !quota.isBlocked })}
                              title={quota.isBlocked ? t('events.detail.unblock_now') : t('events.detail.emergency_cutoff')}
                            >
                              {quota.isBlocked ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Ban className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          )}
                          {canManageQuotas && (
                            <Button variant="ghost" onClick={() => setQuotaToDelete(quota)} title={t('ui.delete')}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <PriceRuleFormModal
        open={ruleModal.open}
        onClose={() => setRuleModal({ open: false })}
        eventId={eventId}
        categories={categories ?? []}
        stands={stands}
        rule={ruleModal.rule}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t('events.detail.confirm_delete_rule_title')}
        description={t('venues.detail.confirm_delete_generic_desc')}
        confirmLabel={t('ui.delete')}
        isLoading={deleteRule.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteRule.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />

      <SalesQuotaFormModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        eventId={eventId}
        categories={categories ?? []}
        stands={stands}
      />

      <ConfirmDialog
        open={!!quotaToDelete}
        title={t('events.detail.confirm_delete_quota_title')}
        description={t('events.detail.confirm_delete_quota_desc')}
        confirmLabel={t('ui.delete')}
        isLoading={deleteQuota.isPending}
        onClose={() => setQuotaToDelete(null)}
        onConfirm={() => {
          if (!quotaToDelete) return;
          deleteQuota.mutate(quotaToDelete.id, { onSuccess: () => setQuotaToDelete(null) });
        }}
      />
    </div>
  );
}


