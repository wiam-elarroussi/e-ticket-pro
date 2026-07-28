'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DoorOpen, Plus, Trash2 } from 'lucide-react';
import { useStand } from '@/hooks/useStands';
import { useGates } from '@/hooks/useGates';
import { useDeleteZone, useZones } from '@/hooks/useZones';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ZoneFormModal } from '@/components/venues/ZoneFormModal';
import { ZoneGateAccessModal } from '@/components/venues/ZoneGateAccessModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Zone } from '@/lib/venue-types';

export default function StandDetailPage() {
  return (
    <RequirePermission permission="venues:read">
      <StandDetailPageContent />
    </RequirePermission>
  );
}

function StandDetailPageContent() {
  const params = useParams<{ id: string; standId: string }>();
  const { id: venueId, standId } = params;

  const { data: stand, isLoading, isError, error } = useStand(standId);
  const { data: gates } = useGates(venueId);
  const { data: zones, isLoading: zonesLoading } = useZones(standId);
  const deleteZone = useDeleteZone();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [gateAccessFor, setGateAccessFor] = useState<Zone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);

  const canCreate = hasPermission('venues:create');
  const canUpdate = hasPermission('venues:update');
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
            ? `Impossible de charger cette tribune : ${error.message}`
            : 'Impossible de charger cette tribune. Réessayez plus tard.'
        }
      />
    );
  }

  if (!stand) {
    return <EmptyState message="Tribune introuvable." />;
  }

  return (
    <div>
      <Link
        href={`/dashboard/venues/${venueId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l’enceinte
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{stand.name}</h1>
        <p className="text-sm text-slate-500">Zones et secteurs de cette tribune.</p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Zones</h2>
        {canCreate && (
          <Button onClick={() => setZoneModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle zone
          </Button>
        )}
      </div>

      {zonesLoading ? (
        <Spinner className="h-5 w-5 text-indigo-600" />
      ) : !zones?.length ? (
        <EmptyState message="Aucune zone pour cette tribune." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <div key={zone.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: zone.colorHex ?? '#94a3b8' }}
                  aria-hidden="true"
                />
                <Link
                  href={`/dashboard/venues/${venueId}/stands/${standId}/zones/${zone.id}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  {zone.name}
                </Link>
              </div>
              <p className="text-xs text-slate-400">{zone._count?.rows ?? 0} rang(s)</p>
              <div className="mt-2 flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                {zone.gateAccess?.length ? (
                  <Badge tone="slate">{zone.gateAccess.length} porte(s) reliée(s)</Badge>
                ) : (
                  <Badge tone="amber">Aucune porte reliée</Badge>
                )}
              </div>
              {(canUpdate || canDelete) && (
                <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setGateAccessFor(zone)} title="Portes d'accès">
                      <DoorOpen className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" onClick={() => setZoneToDelete(zone)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ZoneFormModal open={zoneModalOpen} onClose={() => setZoneModalOpen(false)} standId={standId} />

      <ZoneGateAccessModal
        open={!!gateAccessFor}
        onClose={() => setGateAccessFor(null)}
        zone={gateAccessFor}
        gates={gates ?? []}
      />

      <ConfirmDialog
        open={!!zoneToDelete}
        title="Supprimer cette zone ?"
        description={`"${zoneToDelete?.name}" et tous ses rangs/sièges seront supprimés définitivement.`}
        confirmLabel="Supprimer"
        isLoading={deleteZone.isPending}
        onClose={() => setZoneToDelete(null)}
        onConfirm={() => {
          if (!zoneToDelete) return;
          deleteZone.mutate(zoneToDelete.id, { onSuccess: () => setZoneToDelete(null) });
        }}
      />
    </div>
  );
}
