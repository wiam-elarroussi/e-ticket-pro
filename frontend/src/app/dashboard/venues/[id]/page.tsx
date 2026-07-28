'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DoorOpen, Map, Plus, Trash2 } from 'lucide-react';
import { useVenue } from '@/hooks/useVenues';
import { useDeleteGate, useGates } from '@/hooks/useGates';
import { useDeleteStand, useStands } from '@/hooks/useStands';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
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

  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [standModalOpen, setStandModalOpen] = useState(false);
  const [gateToDelete, setGateToDelete] = useState<Gate | null>(null);
  const [standToDelete, setStandToDelete] = useState<Stand | null>(null);

  const canCreate = hasPermission('venues:create');
  const canDelete = hasPermission('venues:delete');

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
            ? `Impossible de charger cette enceinte : ${error.message}`
            : 'Impossible de charger cette enceinte. Réessayez plus tard.'
        }
      />
    );
  }

  if (!venue) {
    return <EmptyState message="Enceinte introuvable." />;
  }

  return (
    <div>
      <Link href="/dashboard/venues" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Retour aux enceintes
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{venue.name}</h1>
          <p className="text-sm text-slate-500">
            {[venue.city, venue.address].filter(Boolean).join(' · ') || 'Localisation non renseignée'}
          </p>
        </div>
        <Link href={`/dashboard/venues/${venueId}/map`}>
          <Button variant="secondary">
            <Map className="h-4 w-4" />
            Voir le plan 2D
          </Button>
        </Link>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-slate-900">
            <DoorOpen className="h-4 w-4 text-slate-400" />
            Portes
          </h2>
          {canCreate && (
            <Button onClick={() => setGateModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle porte
            </Button>
          )}
        </div>

        {gatesLoading ? (
          <Spinner className="h-5 w-5 text-indigo-600" />
        ) : !gates?.length ? (
          <EmptyState message="Aucune porte pour cette enceinte." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {gates.map((gate) => (
              <div
                key={gate.id}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"
              >
                <span className="text-sm font-medium text-slate-800">{gate.name}</span>
                {gate.code && <Badge tone="slate">{gate.code}</Badge>}
                {canDelete && (
                  <button
                    onClick={() => setGateToDelete(gate)}
                    className="text-slate-300 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Tribunes</h2>
          {canCreate && (
            <Button onClick={() => setStandModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle tribune
            </Button>
          )}
        </div>

        {standsLoading ? (
          <Spinner className="h-5 w-5 text-indigo-600" />
        ) : !stands?.length ? (
          <EmptyState message="Aucune tribune pour cette enceinte." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stands.map((stand) => (
              <div key={stand.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <Link
                  href={`/dashboard/venues/${venueId}/stands/${stand.id}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  {stand.name}
                </Link>
                <p className="mt-1 text-xs text-slate-400">{stand._count?.zones ?? 0} zone(s)</p>
                {canDelete && (
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                    <Button variant="ghost" onClick={() => setStandToDelete(stand)} title="Supprimer">
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
        title="Supprimer cette porte ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={deleteGate.isPending}
        onClose={() => setGateToDelete(null)}
        onConfirm={() => {
          if (!gateToDelete) return;
          deleteGate.mutate(gateToDelete.id, { onSuccess: () => setGateToDelete(null) });
        }}
      />

      <ConfirmDialog
        open={!!standToDelete}
        title="Supprimer cette tribune ?"
        description={`"${standToDelete?.name}" et toutes ses zones/rangs/sièges seront supprimés définitivement.`}
        confirmLabel="Supprimer"
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
