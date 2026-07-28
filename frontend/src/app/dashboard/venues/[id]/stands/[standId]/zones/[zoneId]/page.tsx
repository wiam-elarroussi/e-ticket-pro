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
    <div className="flex h-[550px] items-center justify-center rounded-lg bg-slate-50">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

const directionLabels: Record<string, string> = {
  LEFT_TO_RIGHT: 'Gauche → Droite',
  RIGHT_TO_LEFT: 'Droite → Gauche',
};

const statusLegend: Array<{ status: SeatStatus; label: string; dot: string }> = [
  { status: 'AVAILABLE', label: 'Disponible', dot: 'bg-green-500' },
  { status: 'RESERVED', label: 'Réservé / Quota VIP', dot: 'bg-yellow-500' },
  { status: 'SOLD', label: 'Vendu / Indisponible', dot: 'bg-blue-500' },
  { status: 'OUT_OF_SERVICE', label: 'Bloqué / Hors-service', dot: 'bg-red-500' },
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
            ? `Impossible de charger cette zone : ${error.message}`
            : 'Impossible de charger cette zone. Réessayez plus tard.'
        }
      />
    );
  }

  if (!zone) {
    return <EmptyState message="Zone introuvable." />;
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
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la tribune
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: zone.colorHex ?? '#94a3b8' }}
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold text-slate-900">{zone.name}</h1>
        </div>
        <div className="flex w-fit rounded-lg bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setView('table')}
            className={`rounded-md px-3 py-1.5 font-medium ${view === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Vue tableau
          </button>
          <button
            onClick={() => {
              setView('map');
              setSelectedSeatIds(new Set());
            }}
            className={`rounded-md px-3 py-1.5 font-medium ${view === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Vue plan
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Rangs</h2>
            {canCreate && (
              <Button onClick={() => setRowModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouveau rang
              </Button>
            )}
          </div>

          {!rows.length ? (
            <EmptyState message="Aucun rang pour cette zone." />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Rang</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Sièges</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Sens de numérotation</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                        <td className="px-4 py-3">
                          {row.seats?.length ? (
                            <Badge tone="green">{row.seats.length} siège(s)</Badge>
                          ) : (
                            <Badge tone="amber">Aucun siège</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{directionLabels[row.numberingDirection]}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {canUpdate && (
                              <Button variant="secondary" onClick={() => setGenerateFor(row)}>
                                <Grid3x3 className="h-4 w-4" />
                                Générer les sièges
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" onClick={() => setRowToDelete(row)} title="Supprimer">
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
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {statusLegend.map((item) => (
              <span key={item.status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </div>
          <p className="mb-3 text-sm text-slate-500">
            {canInteractWithSeats
              ? 'Cliquez un siège pour le sélectionner (Maj+clic pour en ajouter plusieurs), tracez un rectangle sur le vide pour une sélection groupée, ou cliquez le libellé d’un rang pour le sélectionner en entier.'
              : 'Consultation seule : vous n’avez pas les droits pour modifier cette zone.'}
            {canUpdate && ' Glissez un siège pour le repositionner.'}
          </p>

          {canManageSeatStatus && selectedSeatIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 ring-1 ring-inset ring-indigo-200">
              <span className="text-sm font-medium text-indigo-900">{selectedSeatIds.size} siège(s) sélectionné(s)</span>
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
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                  Désélectionner
                </button>
              </div>
            </div>
          )}

          {!rows.some((r) => r.seats?.length) ? (
            <EmptyState message="Aucun siège généré pour l’instant. Passez en vue tableau pour en générer." />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
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
        title="Supprimer ce rang ?"
        description={`"${rowToDelete?.label}" et tous ses sièges seront supprimés définitivement.`}
        confirmLabel="Supprimer"
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
