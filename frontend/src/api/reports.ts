import { apiFetch, downloadFile, REPORTS_API_URL } from '@/lib/api-client';
import { ChannelRevenue, EventComparisonEntry, EventDashboard, ExportFormat } from '@/lib/report-types';

export function fetchDashboard(eventId: string) {
  return apiFetch<EventDashboard>(`/reports/dashboard/${eventId}`, { baseUrl: REPORTS_API_URL });
}

export function fetchCompareEvents(eventIds: string[]) {
  return apiFetch<EventComparisonEntry[]>(`/reports/compare?eventIds=${eventIds.join(',')}`, {
    baseUrl: REPORTS_API_URL,
  });
}

export function fetchChannelBreakdown(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : '';
  return apiFetch<ChannelRevenue[]>(`/reports/channels${qs}`, { baseUrl: REPORTS_API_URL });
}

export function downloadOrdersExport(format: ExportFormat, eventId?: string) {
  const params = new URLSearchParams({ format, ...(eventId ? { eventId } : {}) });
  return downloadFile(`/reports/export/orders?${params}`, REPORTS_API_URL);
}

export function downloadAccessLogsExport(eventId: string, format: ExportFormat) {
  return downloadFile(`/reports/export/access-logs/${eventId}?format=${format}`, REPORTS_API_URL);
}

export function downloadCrmExport(format: 'csv' | 'xlsx', eventId?: string) {
  const params = new URLSearchParams({ format, ...(eventId ? { eventId } : {}) });
  return downloadFile(`/reports/export/crm?${params}`, REPORTS_API_URL);
}
