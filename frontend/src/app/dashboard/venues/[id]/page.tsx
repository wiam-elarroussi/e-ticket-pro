'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DoorOpen, Map, Plus, Trash2, Landmark, Shield } from 'lucide-react';
import { useVenue } from '@/hooks/useVenues';
import { useDeleteGate, useGates } from '@/hooks/useGates';
import { useDeleteStand, useStands } from '@/hooks/useStands';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { GateFormModal } from '@/components/venues/GateFormModal';
import { StandFormModal } from '@/components/venues/StandFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Gate, Stand } from '@/lib/venue-types';

export default function VenueDetailPage() {
  return (
    <RequirePermission permission="venues:read">
      <VenueDetailPageContent />
    </RequirePermission>
  );
}

function VenueDetailPageContent() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const { data: venue, isLoading, isError, error } = useVenue(venueId);
  const { data: gates, isLoading: gatesLoading } = useGates(venueId);
  const { data: stands, isLoading: standsLoading } = useStands(venueId);
  const deleteGate = useDeleteGate();
  const deleteStand = useDeleteStand();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [standModalOpen, setStandModalOpen] = useState(false);
  const [gateToDelete, setGateToDelete] = useState<Gate | null>(null);
  const [standToDelete, setStandToDelete] = useState<Stand | null>(null);

  const canCreate = hasPermission('venues:create');
  const canDelete = hasPermission('venues:delete');

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
            ? `${t('venues.detail.error_loading')}: ${error.message}`
            : t('venues.detail.error_loading_generic')
        }
      />
    );
  }

  if (!venue) {
    return <EmptyState message={t('venues.detail.not_found')} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/venues"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('venues.detail.back_to_list')}</span>
      </Link>

      {/* En-tête de l'enceinte */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('venues.official_stadium')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{venue.name}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {[venue.city, venue.address].filter(Boolean).join(' · ') || t('venues.location_not_specified')}
          </p>
        </div>
        <Link href={`/dashboard/venues/${venueId}/map`}>
          <Button className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Map className="h-4 w-4" />
            <span>{t('venues.detail.open_2d_map')}</span>
          </Button>
        </Link>
      </div>

      {/* Portes d'Accès aux Tourniquets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <DoorOpen className="h-4.5 w-4.5 text-[#00875A]" />
            <span>
              {t('venues.detail.gates_section_title')} ({gates?.length ?? 0})
            </span>
          </h2>
          {canCreate && (
            <Button onClick={() => setGateModalOpen(true)} variant="secondary">
              <Plus className="h-4 w-4" />
              <span>{t('venues.detail.new_gate_button')}</span>
            </Button>
          )}
        </div>

        {gatesLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !gates?.length ? (
          <EmptyState message={t('venues.detail.no_gates_configured')} />
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {gates.map((gate) => (
              <div
                key={gate.id}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-2xs"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {gate.name}
                </span>
                {gate.code && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#00875A] ring-1 ring-emerald-200">
                    {gate.code}
                  </span>
                )}
                {canDelete && (
                  <button
                    onClick={() => setGateToDelete(gate)}
                    className="text-slate-300 hover:text-red-600 transition-colors"
                    aria-label="Delete gate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tribunes du Stade */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Shield className="h-4.5 w-4.5 text-[#00875A]" />
            <span>
              {t('venues.detail.stands_section_title')} ({stands?.length ?? 0})
            </span>
          </h2>
          {canCreate && (
            <Button onClick={() => setStandModalOpen(true)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('venues.detail.new_stand_button')}</span>
            </Button>
          )}
        </div>

        {standsLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !stands?.length ? (
          <EmptyState message={t('venues.detail.no_stands_configured')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stands.map((stand) => (
              <div key={stand.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
                <div>
                  <Link
                    href={`/dashboard/venues/${venueId}/stands/${stand.id}`}
                    className="font-extrabold text-slate-900 dark:text-white text-lg hover:text-[#00875A] transition-colors"
                  >
                    {stand.name}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {stand._count?.zones ?? 0} {t('venues.detail.configured_zones')}
                  </p>
                </div>
                {canDelete && (
                  <div className="mt-4 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Button variant="ghost" onClick={() => setStandToDelete(stand)} title={t('ui.delete')}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <GateFormModal open={gateModalOpen} onClose={() => setGateModalOpen(false)} venueId={venueId} />
      <StandFormModal open={standModalOpen} onClose={() => setStandModalOpen(false)} venueId={venueId} />

      <ConfirmDialog
        open={!!gateToDelete}
        title={t('venues.detail.confirm_delete_gate_title')}
        description={t('venues.detail.confirm_delete_generic_desc')}
        confirmLabel={t('ui.delete')}
        isLoading={deleteGate.isPending}
        onClose={() => setGateToDelete(null)}
        onConfirm={() => {
          if (!gateToDelete) return;
          deleteGate.mutate(gateToDelete.id, { onSuccess: () => setGateToDelete(null) });
        }}
      />

      <ConfirmDialog
        open={!!standToDelete}
        title={t('venues.detail.confirm_delete_stand_title')}
        description={`"${standToDelete?.name}" ${t('venues.detail.confirm_delete_stand_desc')}`}
        confirmLabel={t('venues.detail.delete_stand_button')}
        isLoading={deleteStand.isPending}
        onClose={() => setStandToDelete(null)}
        onConfirm={() => {
          if (!standToDelete) return;
          deleteStand.mutate(standToDelete.id, { onSuccess: () => setStandToDelete(null) });
        }}
      />
    </div>
  );
}


