'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Search, Trash2, Calendar, Trophy, Activity, ExternalLink } from 'lucide-react';
import { useDeleteEvent, useEvents } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EventFormModal } from '@/components/events/EventFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Event } from '@/lib/event-types';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function EventsPage() {
  return (
    <RequirePermission permission="events:read">
      <EventsPageContent />
    </RequirePermission>
  );
}

function EventsPageContent() {
  const { data: events, isLoading, isError, error } = useEvents();
  const { data: venues } = useVenues();
  const deleteEvent = useDeleteEvent();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Event | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Event | null>(null);

  const canCreate = hasPermission('events:create');
  const canUpdate = hasPermission('events:update');
  const canDelete = hasPermission('events:delete');

  const venueName = (venueId: string) => venues?.find((v) => v.id === venueId)?.name ?? '—';

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const total = events?.length ?? 0;
    const published = events?.filter((e) => e.status === 'PUBLISHED').length ?? 0;
    const matches = events?.filter((e) => e.type === 'MATCH').length ?? 0;
    return { total, published, matches };
  }, [events]);

  // Filtrage combiné par recherche, type et statut
  const filteredEvents = useMemo(() => {
    return (events ?? []).filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(q) ||
        (e.homeTeam ?? '').toLowerCase().includes(q) ||
        (e.awayTeam ?? '').toLowerCase().includes(q);

      const matchType = !typeFilter || e.type === typeFilter;
      const matchStatus = !statusFilter || e.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [events, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('events.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('events.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('events.desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('events.new_event_button')}</span>
          </Button>
        )}
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('events.kpi_total_label')}
            </span>
            <Calendar className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.total}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('events.kpi_total_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('events.kpi_published_label')}
            </span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#00875A]">{kpis.published}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('events.kpi_published_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('events.kpi_matches_label')}
            </span>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.matches}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('events.kpi_matches_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('events.kpi_pricing_label')}
            </span>
            <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-700">
            {t('events.kpi_pricing_value')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('events.kpi_pricing_sub')}
          </p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('events.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>

        <div className="sm:col-span-3">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs">
            <option value="">{t('events.all_types')}</option>
            <option value="MATCH">⚽ {t('events.matches_only')}</option>
            <option value="COMPETITION">🏆 {t('events.competitions_only')}</option>
            <option value="SHOW">🎭 {t('events.shows_only')}</option>
          </Select>
        </div>

        <div className="sm:col-span-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs">
            <option value="">{t('events.all_statuses')}</option>
            <option value="PUBLISHED">🟢 {t('events.status_published_on_sale')}</option>
            <option value="DRAFT">⚪ {t('events.status_draft')}</option>
            <option value="CANCELLED">🔴 {t('events.status_cancelled')}</option>
          </Select>
        </div>
      </div>

      {/* Tableau des Événements */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('events.error_loading')}: ${error.message}`
              : t('events.error_loading_generic')
          }
        />
      ) : !filteredEvents.length ? (
        <EmptyState message={t('events.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('events.th_event_fixture')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.type')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('events.th_venue')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('events.th_kickoff')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('events.th_sales_status')}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="font-extrabold text-slate-900 dark:text-white hover:text-[#00875A] transition-colors flex items-center gap-1.5"
                      >
                        <span>{event.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                      {event.type === 'MATCH' && event.homeTeam && event.awayTeam && (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          ⚔️ {event.homeTeam} <span className="text-slate-300">vs</span> {event.awayTeam}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                        {event.type === 'MATCH' ? t('events.type_match') : event.type === 'COMPETITION' ? t('events.type_competition') : t('events.type_show')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">{venueName(event.venueId)}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {dateFormatter.format(new Date(event.startAt))}
                    </td>
                    <td className="px-5 py-4">
                      {event.status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#00875A] animate-pulse" />
                          {t('events.status_published')}
                        </span>
                      ) : event.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                          {t('events.status_draft')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                          {t('events.status_cancelled')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canUpdate && (
                          <Button variant="ghost" onClick={() => setEditing(event)} title={t('ui.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" onClick={() => setToDelete(event)} title={t('ui.delete')}>
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

      <EventFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} event={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('events.confirm_delete_title')}
        description={`"${toDelete?.name}" ${t('events.confirm_delete_desc')}`}
        confirmLabel={t('events.confirm_delete_button')}
        isLoading={deleteEvent.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteEvent.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}


