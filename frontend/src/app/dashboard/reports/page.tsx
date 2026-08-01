'use client';

import { useEffect, useState } from 'react';
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
import { Download, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';
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
import { useI18nStore } from '@/store/i18n-store';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { AccessResult, ExportFormat } from '@/lib/report-types';
import { formatMad } from '@/lib/format';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

const channelColors = ['#00875A', '#0EA5E9', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
  const { t } = useI18nStore();

  const [eventId, setEventId] = useState('');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!eventId && events && events.length > 0) {
      setEventId(events[0].id);
    }
  }, [events, eventId]);

  const { data: dashboard, isLoading: dashboardLoading } = useEventDashboard(eventId);
  const { data: globalChannels } = useChannelBreakdown();
  const { data: comparison } = useCompareEvents(Array.from(compareIds));

  const downloadOrders = useDownloadOrdersExport();
  const downloadAccessLogs = useDownloadAccessLogsExport();
  const downloadCrm = useDownloadCrmExport();

  const accessResultLabels: Record<AccessResult, string> = {
    VALID: t('reports.access_valid'),
    ALREADY_SCANNED: t('reports.access_already_scanned'),
    INVALID: t('reports.access_invalid'),
    CANCELLED: t('reports.access_cancelled'),
    WRONG_EVENT: t('reports.access_wrong_event'),
    OVERRIDDEN: t('reports.access_overridden'),
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête du module BI */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('reports.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('reports.page_title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('reports.page_desc')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t('reports.auto_refresh')}
        </span>
      </div>

      <div className="max-w-sm rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <Select label={t('reports.event_to_analyze')} value={eventId} onChange={(e) => setEventId(e.target.value)} className="text-xs">
          <option value="">{t('reports.select_event_dashboard')}</option>
          {(events ?? []).map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} — {dateFormatter.format(new Date(ev.startAt))}
            </option>
          ))}
        </Select>
      </div>

      {/* Tableau de bord live */}
      {!eventId ? (
        <EmptyState message={t('reports.select_event_view_dashboard')} />
      ) : dashboardLoading || !dashboard ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('reports.stadium_occupancy')}</h2>
              <TrendingUp className="h-4 w-4 text-[#00875A]" />
            </div>
            <div className="mx-auto max-w-[180px]">
              <Doughnut
                data={{
                  labels: [t('reports.sold'), t('reports.available')],
                  datasets: [
                    {
                      data: [dashboard.occupancy.soldSeats, dashboard.occupancy.totalSeats - dashboard.occupancy.soldSeats],
                      backgroundColor: ['#00875A', '#E2E8F0'],
                    },
                  ],
                }}
                options={{ plugins: { legend: { display: false } } }}
              />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-2xl font-extrabold text-[#00875A]">
                {(dashboard.occupancy.occupancyRate * 100).toFixed(1)}%
              </span>{' '}
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {dashboard.occupancy.soldSeats} / {dashboard.occupancy.totalSeats} {t('reports.occupied_seats')}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('reports.revenue_by_channel')}</h2>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            {dashboard.revenue.byChannel.length === 0 ? (
              <EmptyState message={t('reports.no_sale_for_event')} />
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
            <p className="mt-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('reports.total_revenue_label')} <span className="font-extrabold text-slate-900 dark:text-white">{formatMad(dashboard.revenue.total)}</span>{' '}
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({dashboard.revenue.orderCount} {t('reports.transaction_count')})</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('reports.access_control_stream')}</h2>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {(Object.keys(dashboard.access.counts) as AccessResult[]).map((result) => (
                <div key={result} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 border border-slate-200/80 dark:border-slate-800/80">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{accessResultLabels[result]}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{dashboard.access.counts[result]}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="text-xl font-extrabold text-[#00875A]">{dashboard.access.entriesGranted}</span> {t('reports.validated_gate_entries')}
            </p>
          </div>
        </div>
      )}

      {/* Répartition globale des ventes par canal */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('reports.sales_breakdown_title')}
        </h2>
        {!globalChannels?.length ? (
          <EmptyState message={t('reports.no_sale_recorded')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_sales_channel')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_validated_orders')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_total_tickets')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_revenue')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {globalChannels.map((c) => (
                    <tr key={c.channelId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{c.channelName}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{c.orderCount}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">{c.ticketCount ?? '—'}</td>
                      <td className="px-5 py-4 font-extrabold text-[#00875A]">{formatMad(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Comparatif entre événements */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('reports.comparison_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('reports.comparison_desc')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-3">
          {(events ?? []).map((ev) => (
            <label key={ev.id} className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-700 text-[#00875A] focus:ring-[#00875A]"
                checked={compareIds.has(ev.id)}
                onChange={() => toggleCompare(ev.id)}
              />
              <span className="text-slate-800 dark:text-slate-100 font-bold">{ev.name}</span>
            </label>
          ))}
        </div>

        {comparison && comparison.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="mx-auto max-w-2xl">
              <Bar
                data={{
                  labels: comparison.map((c) => c.name),
                  datasets: [
                    {
                      label: t('reports.revenue_mad_label'),
                      data: comparison.map((c) => c.revenue),
                      backgroundColor: '#00875A',
                    },
                  ],
                }}
                options={{ plugins: { legend: { display: false } } }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_event')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_tickets_sold')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('reports.th_revenue_short')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {comparison.map((c) => (
                    <tr key={c.eventId}>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">{c.ticketsSold}</td>
                      <td className="px-4 py-2.5 font-extrabold text-[#00875A]">{formatMad(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Archivage & export */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('reports.archiving_exports_title')}
        </h2>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('reports.sales_history_export')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['csv', 'xlsx', 'pdf', 'xml', 'docx'] as ExportFormat[]).map((format) => (
                <Button
                  key={format}
                  variant="secondary"
                  className="text-xs font-bold"
                  isLoading={downloadOrders.isPending}
                  onClick={() => downloadOrders.mutate({ format, eventId: eventId || undefined })}
                >
                  <Download className="h-4 w-4" />
                  <span>{format.toUpperCase()}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('reports.gate_access_log_export')}
            </p>
            {!eventId ? (
              <p className="text-xs text-slate-400 font-medium">
                {t('reports.select_event_export_access')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(['csv', 'xlsx', 'pdf', 'xml', 'docx'] as ExportFormat[]).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    className="text-xs font-bold"
                    isLoading={downloadAccessLogs.isPending}
                    onClick={() => downloadAccessLogs.mutate({ eventId, format })}
                  >
                    <Download className="h-4 w-4" />
                    <span>{format.toUpperCase()}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {canExportCrm && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('reports.crm_export_title')}
              </p>
              <p className="mb-2 text-xs text-slate-400">
                {t('reports.crm_export_desc')}
              </p>
              <div className="flex flex-wrap gap-2">
                {(['csv', 'xlsx', 'docx'] as const).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    className="text-xs font-bold"
                    isLoading={downloadCrm.isPending}
                    onClick={() => downloadCrm.mutate({ format, eventId: eventId || undefined })}
                  >
                    <Download className="h-4 w-4" />
                    <span>{format.toUpperCase()}</span>
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


