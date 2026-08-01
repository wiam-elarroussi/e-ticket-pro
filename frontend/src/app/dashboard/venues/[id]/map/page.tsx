'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Check, PenLine, X, Map, Info } from 'lucide-react';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useUpdateZonePolygon } from '@/hooks/useZones';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { MapPoint, Zone } from '@/lib/venue-types';

const ZonePolygonEditor = dynamic(() => import('@/components/venues/map/ZonePolygonEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[550px] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
      <Spinner className="h-6 w-6 text-[#00875A]" />
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
  const { t } = useI18nStore();

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
        <Spinner className="h-6 w-6 text-[#00875A]" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `${t('venues.map.error_loading')}: ${error.message}`
            : t('venues.map.error_loading_generic')
        }
      />
    );
  }

  if (!venue) {
    return <EmptyState message={t('venues.detail.not_found')} />;
  }

  if (zones.length === 0) {
    const firstStand = venue.stands[0];
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/venues/${venueId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('venues.map.back_to_venue')}</span>
        </Link>
        <EmptyState
          message={
            firstStand
              ? `${t('venues.map.no_zone_prefix')} "${venue.name}" ${t('venues.map.no_zone_suffix')} "${firstStand.name}" ${t('venues.map.no_zone_suffix2')}`
              : `${t('venues.map.no_stand_prefix')} "${venue.name}"${t('venues.map.no_stand_suffix')}`
          }
        />
        <div className="mt-4 flex justify-center">
          <Link href={firstStand ? `/dashboard/venues/${venueId}/stands/${firstStand.id}` : `/dashboard/venues/${venueId}`}>
            <Button className="bg-[#00875A] text-white hover:bg-[#00754e]">
              {firstStand ? t('venues.map.go_to_stand') : t('venues.map.go_to_venue')}
            </Button>
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
    <div className="space-y-6">
      <Link
        href={`/dashboard/venues/${venueId}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('venues.map.back_to_stadium_venue')}</span>
      </Link>

      {/* En-tête du plan 2D */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Map className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('venues.map.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('venues.map.title_prefix')} {venue.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('venues.map.desc')}
          </p>
        </div>

        {/* Légende de couleurs en overlay */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 ring-1 ring-slate-200 dark:ring-slate-700 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#00875A]" />
            <span className="text-slate-700 dark:text-slate-300">{t('venues.map.legend_available')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            <span className="text-slate-700 dark:text-slate-300">{t('venues.map.legend_sold')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-slate-700 dark:text-slate-300">{t('venues.map.legend_reserved')}</span>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
          {!drawingZoneId ? (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <Select className="max-w-xs text-xs" value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
                <option value="">{t('venues.map.select_zone_to_draw')}</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.standName} · {zone.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                disabled={!selectedZoneId}
                onClick={() => startDrawing(selectedZoneId)}
                className="text-xs"
              >
                <PenLine className="h-4 w-4" />
                <span>{t('venues.map.draw_polygon')}</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-2 rounded-xl ring-1 ring-amber-200">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  {t('venues.map.drawing_mode_prefix')}{drawingPoints.length} {t('venues.map.drawing_mode_suffix')}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" onClick={cancelDrawing}>
                  <X className="h-4 w-4" />
                  <span>{t('ui.cancel')}</span>
                </Button>
                <Button
                  onClick={finishDrawing}
                  disabled={drawingPoints.length < 3}
                  isLoading={updatePolygon.isPending}
                  className="bg-[#00875A] text-white hover:bg-[#00754e]"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('venues.map.save_polygon')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <ZonePolygonEditor
            zones={zones as Zone[]}
            fitContainer={true}
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
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800/80">
          <Info className="h-4 w-4 text-slate-400" />
          <span>
            {t('venues.map.no_boundary_yet')}
          </span>
        </div>
      )}
    </div>
  );
}


