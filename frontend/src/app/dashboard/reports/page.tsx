'use client';

import { useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import {
  useChannelBreakdown,
  useCompareEvents,
  useDownloadAccessLogsExport,
  useDownloadCrmExport,
  useDownloadOrdersExport,
  useEventDashboard,
} from '@/hooks/useReports';
import { useAuthStore } from '@/store/auth-store';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { AccessResult, ExportFormat } from '@/lib/report-types';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

const accessResultLabels: Record<AccessResult, string> = {
  VALID: 'Valide',
  ALREADY_SCANNED: 'Déjà scanné',
  INVALID: 'Invalide',
  CANCELLED: 'Annulé',
  WRONG_EVENT: 'Mauvais événement',
  OVERRIDDEN: 'Entrée forcée',
};

const channelColors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  return (
    <RequirePermission permission="reports:read">
      <ReportsPageContent />
    </RequirePermission>
  );
}

function ReportsPageContent() {
  const { data: events } = useEvents();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canExportCrm = hasPermission('reports:export-crm');

  const [eventId, setEventId] = useState('');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const { data: dashboard, isLoading: dashboardLoading } = useEventDashboard(eventId);
  const { data: globalChannels } = useChannelBreakdown();
  const { data: comparison } = useCompareEvents(Array.from(compareIds));

  const downloadOrders = useDownloadOrdersExport();
  const downloadAccessLogs = useDownloadAccessLogsExport();
  const downloadCrm = useDownloadCrmExport();

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Supervision & rapports</h1>
      <p className="mb-6 text-sm text-slate-500">
        Tableau de bord live, comparatifs et exports — module 7. Le tableau de bord se rafraîchit
        automatiquement toutes les 15 secondes.
      </p>

      <div className="mb-6 max-w-sm">
        <Select label="Événement" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Choisir un événement pour le tableau de bord…</option>
          {(events ?? []).map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} — {dateFormatter.format(new Date(ev.startAt))}
            </option>
          ))}
        </Select>
      </div>

      {/* 7.1 — Tableau de bord live */}
      {!eventId ? (
        <EmptyState message="Choisissez un événement pour afficher son tableau de bord." />
      ) : dashboardLoading || !dashboard ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Remplissage du stade</h2>
            <div className="mx-auto max-w-[180px]">
              <Doughnut
                data={{
                  labels: ['Vendus', 'Disponibles'],
                  datasets: [
                    {
                      data: [dashboard.occupancy.soldSeats, dashboard.occupancy.totalSeats - dashboard.occupancy.soldSeats],
                      backgroundColor: ['#4F46E5', '#E2E8F0'],
                    },
                  ],
                }}
                options={{ plugins: { legend: { display: false } } }}
              />
            </div>
            <p className="mt-3 text-center text-sm text-slate-600">
              <span className="text-lg font-semibold text-slate-900">
                {(dashboard.occupancy.occupancyRate * 100).toFixed(1)}%
              </span>{' '}
              — {dashboard.occupancy.soldSeats} / {dashboard.occupancy.totalSeats} sièges
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Chiffre d’affaires par canal</h2>
            {dashboard.revenue.byChannel.length === 0 ? (
              <EmptyState message="Aucune vente enregistrée pour cet événement." />
            ) : (
              <div className="mx-auto max-w-[180px]">
                <Doughnut
                  data={{
                    labels: dashboard.revenue.byChannel.map((c) => c.channelName),
                    datasets: [
                      {
                        data: dashboard.revenue.byChannel.map((c) => c.amount),
                        backgroundColor: dashboard.revenue.byChannel.map((_, i) => channelColors[i % channelColors.length]),
                      },
                    ],
                  }}
                />
              </div>
            )}
            <p className="mt-3 text-center text-sm text-slate-600">
              Total : <span className="font-semibold text-slate-900">{priceFormatter.format(dashboard.revenue.total)}</span>{' '}
              ({dashboard.revenue.orderCount} vente{dashboard.revenue.orderCount > 1 ? 's' : ''})
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Flux de contrôle d’accès</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              {(Object.keys(dashboard.access.counts) as AccessResult[]).map((result) => (
                <div key={result} className="flex items-center justify-between">
                  <span className="text-slate-500">{accessResultLabels[result]}</span>
                  <span className="font-medium text-slate-800">{dashboard.access.counts[result]}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-center text-sm text-slate-600">
              <span className="text-lg font-semibold text-green-700">{dashboard.access.entriesGranted}</span> entrées validées
            </p>
          </div>
        </div>
      )}

      {/* Répartition globale des ventes par canal */}
      <div className="mb-8">
        <h2 className="mb-3 font-medium text-slate-900">Répartition des ventes par canal (tous événements)</h2>
        {!globalChannels?.length ? (
          <EmptyState message="Aucune vente enregistrée." />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Canal</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Ventes</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Billets</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Chiffre d’affaires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalChannels.map((c) => (
                    <tr key={c.channelId}>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.channelName}</td>
                      <td className="px-4 py-3 text-slate-500">{c.orderCount}</td>
                      <td className="px-4 py-3 text-slate-500">{c.ticketCount ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{priceFormatter.format(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 7.2 — Comparatif entre événements */}
      <div className="mb-8">
        <h2 className="mb-1 font-medium text-slate-900">Comparatif entre événements</h2>
        <p className="mb-3 text-sm text-slate-500">Sélectionnez jusqu’à 6 événements à comparer (billets vendus, chiffre d’affaires).</p>
        <div className="mb-4 grid grid-cols-1 gap-1 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {(events ?? []).map((ev) => (
            <label key={ev.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={compareIds.has(ev.id)}
                onChange={() => toggleCompare(ev.id)}
              />
              <span className="text-slate-700">{ev.name}</span>
            </label>
          ))}
        </div>

        {comparison && comparison.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto max-w-2xl">
              <Bar
                data={{
                  labels: comparison.map((c) => c.name),
                  datasets: [
                    {
                      label: 'Chiffre d’affaires (MAD)',
                      data: comparison.map((c) => c.revenue),
                      backgroundColor: '#4F46E5',
                    },
                  ],
                }}
                options={{ plugins: { legend: { display: false } } }}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Événement</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Billets vendus</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Chiffre d’affaires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.map((c) => (
                    <tr key={c.eventId}>
                      <td className="px-4 py-2 text-slate-800">{c.name}</td>
                      <td className="px-4 py-2 text-slate-500">{c.ticketsSold}</td>
                      <td className="px-4 py-2 text-slate-700">{priceFormatter.format(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 7.3 — Archivage & export */}
      <div>
        <h2 className="mb-1 font-medium text-slate-900">Exports</h2>
        <p className="mb-3 text-sm text-slate-500">
          {eventId ? 'Limités à l’événement sélectionné ci-dessus.' : 'Portant sur l’ensemble des ventes (choisissez un événement pour limiter l’export).'}
        </p>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Historique des ventes</p>
            <div className="flex flex-wrap gap-2">
              {(['csv', 'xlsx', 'pdf', 'xml'] as ExportFormat[]).map((format) => (
                <Button
                  key={format}
                  variant="secondary"
                  isLoading={downloadOrders.isPending}
                  onClick={() => downloadOrders.mutate({ format, eventId: eventId || undefined })}
                >
                  <Download className="h-4 w-4" />
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Journal de contrôle d’accès</p>
            {!eventId ? (
              <p className="text-xs text-slate-400">Choisissez un événement ci-dessus pour exporter son journal d’accès.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(['csv', 'xlsx', 'pdf', 'xml'] as ExportFormat[]).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    isLoading={downloadAccessLogs.isPending}
                    onClick={() => downloadAccessLogs.mutate({ eventId, format })}
                  >
                    <Download className="h-4 w-4" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {canExportCrm && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-sm font-medium text-slate-700">Contacts CRM (acheteurs &amp; abonnés)</p>
              <p className="mb-2 text-xs text-slate-400">
                Données personnelles à usage marketing — export réservé aux droits étendus.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['csv', 'xlsx'] as const).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    isLoading={downloadCrm.isPending}
                    onClick={() => downloadCrm.mutate({ format, eventId: eventId || undefined })}
                  >
                    <Download className="h-4 w-4" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
