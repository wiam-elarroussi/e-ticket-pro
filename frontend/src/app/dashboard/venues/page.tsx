'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Search, Trash2, Landmark, DoorOpen, Map, Users, ExternalLink } from 'lucide-react';
import { useDeleteVenue, useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { VenueFormModal } from '@/components/venues/VenueFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Venue } from '@/lib/venue-types';

export default function VenuesPage() {
  return (
    <RequirePermission permission="venues:read">
      <VenuesPageContent />
    </RequirePermission>
  );
}

function VenuesPageContent() {
  const { data: venues, isLoading, isError, error } = useVenues();
  const deleteVenue = useDeleteVenue();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Venue | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Venue | null>(null);

  const canCreate = hasPermission('venues:create');
  const canUpdate = hasPermission('venues:update');
  const canDelete = hasPermission('venues:delete');

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const totalVenues = venues?.length ?? 0;
    const totalStands = venues?.reduce((acc, v) => acc + (v._count?.stands ?? 0), 0) ?? 0;
    const totalGates = venues?.reduce((acc, v) => acc + (v._count?.gates ?? 0), 0) ?? 0;
    return { totalVenues, totalStands, totalGates };
  }, [venues]);

  // Filtrage combiné par recherche (nom ou ville)
  const filteredVenues = useMemo(() => {
    return (venues ?? []).filter((v) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || (v.city ?? '').toLowerCase().includes(q) || (v.address ?? '').toLowerCase().includes(q);
    });
  }, [venues, search]);

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
              {t('venues.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('venues.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('venues.desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('venues.new_venue_button')}</span>
          </Button>
        )}
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('venues.kpi_total_label')}
            </span>
            <Landmark className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalVenues}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('venues.kpi_total_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('venues.kpi_stands_label')}
            </span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalStands}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('venues.kpi_stands_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('venues.kpi_gates_label')}
            </span>
            <DoorOpen className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalGates}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('venues.kpi_gates_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('venues.kpi_map_label')}
            </span>
            <Map className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-700">
            {t('venues.kpi_map_value')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('venues.kpi_map_sub')}
          </p>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('venues.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Liste des Enceintes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('venues.error_loading')}: ${error.message}`
              : t('venues.error_loading_generic')
          }
        />
      ) : !filteredVenues.length ? (
        <EmptyState message={t('venues.no_match_criteria')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVenues.map((venue) => (
            <div key={venue.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A]">
                    {t('venues.official_stadium')}
                  </span>
                  <Link
                    href={`/dashboard/venues/${venue.id}/map`}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
                    title={t('venues.view_2d_map')}
                  >
                    <Map className="h-3.5 w-3.5" />
                    <span>{t('venues.map_2d')}</span>
                  </Link>
                </div>

                <Link
                  href={`/dashboard/venues/${venue.id}`}
                  className="mt-3 block font-extrabold text-slate-900 dark:text-white text-lg hover:text-[#00875A] transition-colors flex items-center gap-1.5"
                >
                  <span>{venue.name}</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Link>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {[venue.city, venue.address].filter(Boolean).join(' · ') || t('venues.location_not_specified')}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                    {venue._count?.stands ?? 0} {t('venues.stand_count')}
                  </span>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                    {venue._count?.gates ?? 0} {t('venues.gate_count')}
                  </span>
                </div>
              </div>

              {(canUpdate || canDelete) && (
                <div className="mt-4 flex justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setEditing(venue)} title={t('ui.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" onClick={() => setToDelete(venue)} title={t('ui.delete')}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <VenueFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} venue={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('venues.confirm_delete_title')}
        description={`"${toDelete?.name}" ${t('venues.confirm_delete_desc')}`}
        confirmLabel={t('venues.confirm_delete_button')}
        isLoading={deleteVenue.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteVenue.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}


