'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Check, PenLine, X } from 'lucide-react';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useUpdateZonePolygon } from '@/hooks/useZones';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { MapPoint, Zone } from '@/lib/venue-types';

// react-konva touche le canvas dès l'import : rendu strictement côté client.
const ZonePolygonEditor = dynamic(() => import('@/components/venues/map/ZonePolygonEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[550px] items-center justify-center rounded-lg bg-slate-50">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

export default function VenueMapPage() {
  return (
    <RequirePermission permission="venues:read">
      <VenueMapPageContent />
    </RequirePermission>
  );
}

function VenueMapPageContent() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const router = useRouter();

  const { data: venue, isLoading, isError, error } = useVenueFullTree(venueId);
  const updatePolygon = useUpdateZonePolygon();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = hasPermission('venues:update');

  const zones = useMemo(
    () => (venue?.stands ?? []).flatMap((stand) => stand.zones.map((z) => ({ ...z, standName: stand.name }))),
    [venue],
  );

  const [drawingZoneId, setDrawingZoneId] = useState<string | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<MapPoint[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');

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
            ? `Impossible de charger le plan : ${error.message}`
            : 'Impossible de charger le plan. Réessayez plus tard.'
        }
      />
    );
  }

  if (!venue) {
    return <EmptyState message="Enceinte introuvable." />;
  }

  if (zones.length === 0) {
    const firstStand = venue.stands[0];
    return (
      <div>
        <Link
          href={`/dashboard/venues/${venueId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l’enceinte
        </Link>
        <EmptyState
          message={
            firstStand
              ? `Aucune zone n'existe encore pour "${venue.name}". Créez-en une depuis la tribune "${firstStand.name}" avant de pouvoir dessiner un contour.`
              : `Aucune tribune n'existe encore pour "${venue.name}". Créez d'abord une tribune, puis une zone, avant d'accéder au plan.`
          }
        />
        <div className="mt-4 flex justify-center">
          <Link href={firstStand ? `/dashboard/venues/${venueId}/stands/${firstStand.id}` : `/dashboard/venues/${venueId}`}>
            <Button>{firstStand ? 'Aller à la tribune pour créer une zone' : "Aller à l'enceinte pour créer une tribune"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const startDrawing = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    setDrawingZoneId(zoneId);
    setDrawingPoints(zone?.mapPolygon ?? []);
  };

  const cancelDrawing = () => {
    setDrawingZoneId(null);
    setDrawingPoints([]);
  };

  const finishDrawing = () => {
    if (!drawingZoneId || drawingPoints.length < 3) return;
    updatePolygon.mutate(
      { id: drawingZoneId, points: drawingPoints },
      { onSuccess: () => cancelDrawing() },
    );
  };

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
        <h1 className="text-xl font-semibold text-slate-900">Plan 2D — {venue.name}</h1>
        <p className="text-sm text-slate-500">
          Cliquez sur une zone pour ouvrir son plan de sièges. {canEdit && 'Dessinez ou redessinez son contour au besoin.'}
        </p>
      </div>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
          {!drawingZoneId ? (
            <>
              <Select className="max-w-xs" value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
                <option value="">Choisir une zone à dessiner…</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.standName} · {zone.name}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" disabled={!selectedZoneId} onClick={() => startDrawing(selectedZoneId)}>
                <PenLine className="h-4 w-4" />
                Dessiner le contour
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Mode dessin actif — cliquez sur le plan pour ajouter des points ({drawingPoints.length} placé(s), 3
                minimum).
              </p>
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" onClick={cancelDrawing}>
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
                <Button
                  onClick={finishDrawing}
                  disabled={drawingPoints.length < 3}
                  isLoading={updatePolygon.isPending}
                >
                  <Check className="h-4 w-4" />
                  Terminer
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <ZonePolygonEditor
            zones={zones as Zone[]}
            drawingZoneId={drawingZoneId}
            drawingPoints={drawingPoints}
            onCanvasClick={(point) => {
              if (drawingZoneId) setDrawingPoints((prev) => [...prev, point]);
            }}
            onZoneClick={(zoneId) => {
              if (drawingZoneId) return;
              const zone = zones.find((z) => z.id === zoneId);
              if (zone) {
                router.push(`/dashboard/venues/${venueId}/stands/${zone.standId}/zones/${zone.id}`);
              }
            }}
          />
        </div>
      </div>

      {zones.every((z) => !z.mapPolygon || z.mapPolygon.length < 3) && (
        <p className="mt-3 text-sm text-slate-400">
          Aucune zone n’a encore de contour dessiné {canEdit && '— utilisez le sélecteur ci-dessus pour commencer'}.
        </p>
      )}
    </div>
  );
}
