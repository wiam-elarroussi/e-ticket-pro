'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Grid3x3, Plus, Trash2, X } from 'lucide-react';
import { useZone } from '@/hooks/useZones';
import { useDeleteRow } from '@/hooks/useRows';
import { useBulkUpdateSeatStatus, useUpdateSeat } from '@/hooks/useSeats';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RowFormModal } from '@/components/venues/RowFormModal';
import { GenerateSeatsModal } from '@/components/venues/GenerateSeatsModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Row, SeatStatus } from '@/lib/venue-types';

// react-konva touche le canvas dès l'import : rendu strictement côté client.
const SeatCanvas = dynamic(() => import('@/components/venues/map/SeatCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[550px] items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

const directionKeys: Record<string, TranslationKey> = {
  LEFT_TO_RIGHT: 'venues.zone.direction_ltr',
  RIGHT_TO_LEFT: 'venues.zone.direction_rtl',
};

const statusLegendDef: Array<{ status: SeatStatus; labelKey: TranslationKey; dot: string }> = [
  { status: 'AVAILABLE', labelKey: 'venues.zone.status_available', dot: 'bg-green-500' },
  { status: 'RESERVED', labelKey: 'venues.zone.status_reserved', dot: 'bg-yellow-500' },
  { status: 'SOLD', labelKey: 'venues.zone.status_sold', dot: 'bg-blue-500' },
  { status: 'OUT_OF_SERVICE', labelKey: 'venues.zone.status_out_of_service', dot: 'bg-red-500' },
];

const statusButtonClasses: Record<SeatStatus, string> = {
  AVAILABLE: 'bg-green-600 hover:bg-green-500',
  RESERVED: 'bg-yellow-500 hover:bg-yellow-400',
  SOLD: 'bg-blue-600 hover:bg-blue-500',
  OUT_OF_SERVICE: 'bg-red-600 hover:bg-red-500',
};

type ViewMode = 'table' | 'map';

export default function ZoneDetailPage() {
  return (
    <RequirePermission permission="venues:read">
      <ZoneDetailPageContent />
    </RequirePermission>
  );
}

function ZoneDetailPageContent() {
  const params = useParams<{ id: string; standId: string; zoneId: string }>();
  const { id: venueId, standId, zoneId } = params;

  // La zone embarque rows[].seats[] : une seule requête alimente le tableau ET le plan.
  const { data: zone, isLoading, isError, error } = useZone(zoneId);
  const deleteRow = useDeleteRow();
  const updateSeat = useUpdateSeat();
  const bulkUpdateStatus = useBulkUpdateSeatStatus();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const t = useI18nStore((s) => s.t);
  const statusLegend = statusLegendDef.map((item) => ({ ...item, label: t(item.labelKey) }));

  const [view, setView] = useState<ViewMode>('table');
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [generateFor, setGenerateFor] = useState<Row | null>(null);
  const [rowToDelete, setRowToDelete] = useState<Row | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());

  const canCreate = hasPermission('venues:create');
  const canUpdate = hasPermission('venues:update');
  const canDelete = hasPermission('venues:delete');
  // Droit distinct : un Superviseur peut changer l'état d'un siège sans avoir
  // le droit de modifier la structure (repositionner, générer, supprimer).
  const canManageSeatStatus = hasPermission('venues:seats:manage');
  const canInteractWithSeats = canUpdate || canManageSeatStatus;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `${t('venues.zone.error_loading')} : ${error.message}`
            : t('venues.zone.error_loading_generic')
        }
      />
    );
  }

  if (!zone) {
    return <EmptyState message={t('venues.zone.not_found')} />;
  }

  const rows = zone.rows ?? [];

  const applyBulkStatus = (status: SeatStatus) => {
    if (selectedSeatIds.size === 0) return;
    bulkUpdateStatus.mutate(
      { seatIds: Array.from(selectedSeatIds), status },
      { onSuccess: () => setSelectedSeatIds(new Set()) },
    );
  };

  return (
    <div>
      <Link
        href={`/dashboard/venues/${venueId}/stands/${standId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('venues.zone.back_to_stand')}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: zone.colorHex ?? '#94a3b8' }}
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{zone.name}</h1>
        </div>
        <div className="flex w-fit rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-sm">
          <button
            onClick={() => setView('table')}
            className={`rounded-md px-3 py-1.5 font-medium ${view === 'table' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t('venues.zone.view_table')}
          </button>
          <button
            onClick={() => {
              setView('map');
              setSelectedSeatIds(new Set());
            }}
            className={`rounded-md px-3 py-1.5 font-medium ${view === 'map' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t('venues.zone.view_map')}
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-900 dark:text-white">{t('venues.zone.rows_title')}</h2>
            {canCreate && (
              <Button onClick={() => setRowModalOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('venues.zone.new_row_button')}
              </Button>
            )}
          </div>

          {!rows.length ? (
            <EmptyState message={t('venues.zone.no_rows')} />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('venues.zone.th_row')}</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('venues.zone.th_seats')}</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('venues.zone.th_direction')}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{row.label}</td>
                        <td className="px-4 py-3">
                          {row.seats?.length ? (
                            <Badge tone="green">{row.seats.length} {t('venues.zone.seat_count')}</Badge>
                          ) : (
                            <Badge tone="amber">{t('venues.zone.no_seats')}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t(directionKeys[row.numberingDirection])}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {canUpdate && (
                              <Button variant="secondary" onClick={() => setGenerateFor(row)}>
                                <Grid3x3 className="h-4 w-4" />
                                {t('venues.zone.generate_seats_button')}
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" onClick={() => setRowToDelete(row)} title={t('ui.delete')}>
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
        </>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {statusLegend.map((item) => (
              <span key={item.status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </div>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {canInteractWithSeats
              ? t('venues.zone.interact_hint')
              : t('venues.zone.readonly_hint')}
            {canUpdate && t('venues.zone.drag_hint')}
          </p>

          {canManageSeatStatus && selectedSeatIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 ring-1 ring-inset ring-indigo-200">
              <span className="text-sm font-medium text-indigo-900">{selectedSeatIds.size} {t('venues.zone.selected_seats_count')}</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {statusLegend.map((item) => (
                  <button
                    key={item.status}
                    onClick={() => applyBulkStatus(item.status)}
                    disabled={bulkUpdateStatus.isPending}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${statusButtonClasses[item.status]}`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedSeatIds(new Set())}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('venues.zone.deselect')}
                </button>
              </div>
            </div>
          )}

          {!rows.some((r) => r.seats?.length) ? (
            <EmptyState message={t('venues.zone.no_seats_generated')} />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="overflow-x-auto">
                <SeatCanvas
                  rows={rows}
                  selectedSeatIds={selectedSeatIds}
                  onSelectionChange={canInteractWithSeats ? setSelectedSeatIds : () => {}}
                  canDragSeats={canUpdate}
                  onSeatDragEnd={(seatId, x, y) => {
                    if (!canUpdate) return;
                    updateSeat.mutate({ id: seatId, payload: { x, y } });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <RowFormModal open={rowModalOpen} onClose={() => setRowModalOpen(false)} zoneId={zoneId} />

      <GenerateSeatsModal open={!!generateFor} onClose={() => setGenerateFor(null)} row={generateFor} />

      <ConfirmDialog
        open={!!rowToDelete}
        title={t('venues.zone.confirm_delete_row_title')}
        description={`"${rowToDelete?.label}" ${t('venues.zone.confirm_delete_row_desc_suffix')}`}
        confirmLabel={t('ui.delete')}
        isLoading={deleteRow.isPending}
        onClose={() => setRowToDelete(null)}
        onConfirm={() => {
          if (!rowToDelete) return;
          deleteRow.mutate(rowToDelete.id, { onSuccess: () => setRowToDelete(null) });
        }}
      />
    </div>
  );
}
