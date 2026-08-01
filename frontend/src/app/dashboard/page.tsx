'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ScanLine,
  ShieldCheck,
  Ticket,
  Users2,
  TrendingUp,
  Landmark,
  CalendarDays,
  Palette,
  Store,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  PieChart,
  RefreshCw,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';
import { useMe } from '@/hooks/useMe';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useEventDashboard, useDownloadCrmExport } from '@/hooks/useReports';
import { useAccessLogs } from '@/hooks/useAccess';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatMad } from '@/lib/format';

const CARD = 'glass-card transition-all duration-300';

// Utilitaire universel de téléchargement de fichier Blob
const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function DashboardHomePage() {
  const { data: me } = useMe();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { lang, t } = useI18nStore();



  const { data: events } = useEvents();
  const publishedEvents = useMemo(() => (events ?? []).filter((e) => e.status === 'PUBLISHED'), [events]);
  const [eventId, setEventId] = useState('');
  
  // Active event selection: selected eventId OR event with active sales OR first published event
  const activeEventId = useMemo(() => {
    if (eventId) return eventId;
    const withSales = publishedEvents.find((e) => e.name.includes('Derby') || e.name.includes('Raja'));
    return withSales?.id || publishedEvents[0]?.id || '';
  }, [eventId, publishedEvents]);

  const event = events?.find((e) => e.id === activeEventId);

  const { data: dashboard } = useEventDashboard(activeEventId);
  const { data: venue } = useVenueFullTree(event?.venueId ?? '');
  const locale = lang === 'EN' ? 'en-US' : 'fr-FR';

  // Panier moyen réel (revenue.total / revenue.orderCount) — null si aucune commande.
  const avgCartStr = dashboard && dashboard.revenue.orderCount > 0
    ? formatMad(dashboard.revenue.total / dashboard.revenue.orderCount)
    : null;

  // Refus anti-fraude réels = tous les scans hors VALID/OVERRIDDEN (access.counts, access-service).
  const accessRefusals = dashboard
    ? Object.entries(dashboard.access.counts).reduce(
        (sum, [result, count]) => (result === 'VALID' || result === 'OVERRIDDEN' ? sum : sum + count),
        0,
      )
    : null;

  // Onglet actif : "Supervision Live Stade" vs "Business Intelligence & Marketing"
  const [activeTab, setActiveTab] = useState<'LIVE' | 'BI'>('LIVE');

  // Remplissage réel par tribune — dérivé de venue.stands (statut des sièges), aucune
  // valeur fictive : une tribune sans sièges définis n'apparaît simplement pas.
  const standOccupancy = useMemo(() => {
    if (!venue?.stands?.length) return [];
    return venue.stands
      .map((stand) => {
        const seats = stand.zones.flatMap((z) => z.rows?.flatMap((r) => r.seats ?? []) ?? []);
        const sold = seats.filter((s) => s.status === 'SOLD').length;
        const total = seats.length;
        const rate = total ? sold / total : 0;
        return { id: stand.id, name: stand.name, sold, total, rate };
      })
      .filter((s) => s.total > 0);
  }, [venue]);

  // Répartition par canal de vente — dérivée des vraies données de dashboard.revenue.byChannel
  // (reports-service), pas de valeurs fictives : un canal sans vente n'apparaît simplement pas.
  const CHANNEL_COLORS = ['bg-[#00875A]', 'bg-blue-600', 'bg-amber-500', 'bg-purple-600', 'bg-rose-600'];
  const salesChannels = useMemo(() => {
    const byChannel = dashboard?.revenue?.byChannel ?? [];
    const total = byChannel.reduce((sum, c) => sum + c.amount, 0);
    return byChannel
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .map((c, index) => ({
        name: c.channelName,
        amount: c.amount,
        percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        count: `${c.orderCount} ${t('dash.channel.orders_suffix')}`,
        color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
      }));
  }, [dashboard, t]);

  // Logs d'accès & détection anti-fraude Checksum Mode 4 (Module 6) — vrai flux
  // access-service (rafraîchi toutes les 4s, voir useAccessLogs), pas de simulation.
  const { data: accessLogs } = useAccessLogs(activeEventId);
  const gateNameById = useMemo(() => {
    const map = new Map<string, string>();
    venue?.gates?.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [venue]);

  const liveGateLogs = useMemo(() => {
    const locale = lang === 'EN' ? 'en-US' : 'fr-FR';
    return (accessLogs ?? []).slice(0, 8).map((log) => {
      const status: 'VALIDE' | 'DEJA_SCANNE' | 'CODE_INVALIDE' =
        log.result === 'VALID' || log.result === 'OVERRIDDEN'
          ? 'VALIDE'
          : log.result === 'ALREADY_SCANNED'
            ? 'DEJA_SCANNE'
            : 'CODE_INVALIDE';
      return {
        id: log.id,
        code: log.rawCode ?? log.id.slice(0, 12).toUpperCase(),
        gate: gateNameById.get(log.gateId) ?? log.gateId.slice(0, 8),
        time: new Date(log.scannedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status,
        alert: status !== 'VALIDE',
      };
    });
  }, [accessLogs, gateNameById, lang]);


  // Moteur d'exportation réel multi-format (Module 7.3)
  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV' | 'XML' | 'DOCX') => {
    if (!event || !dashboard) {
      toast.error(t('dash.export.no_data_error'));
      return;
    }
    const eventName = event.name;
    const dateStr = new Date().toISOString().slice(0, 10);
    const occupancyPct = `${Math.round(dashboard.occupancy.occupancyRate * 100)}%`;
    const revenueStr = formatMad(dashboard.revenue.total);
    const uniqueTickets = dashboard.tickets.active.toLocaleString(locale);
    const scannedEntries = dashboard.access.entriesGranted.toLocaleString(locale);

    if (format === 'CSV') {
      const rows = [
        [t('dash.export.metric'), t('dash.export.value'), t('dash.export.details')],
        [t('dash.export.event'), eventName, dateStr],
        [t('dash.export.occupancy_rate'), occupancyPct, t('dash.kpi_occupancy_seats')],
        [t('dash.export.total_revenue'), revenueStr, t('dash.kpi_revenue_avg_cart')],
        [t('dash.export.unique_valid_tickets'), uniqueTickets, t('dash.export.subscriber_cards_detail')],
        [t('dash.export.scanned_entries'), scannedEntries, t('dash.kpi_access_valid')],
        ['', '', ''],
        [t('dash.export.sales_channel'), t('dash.export.amount_mad'), t('dash.export.percentage')],
        ...salesChannels.map((c) => [c.name, formatMad(c.amount), `${c.percent}%`]),
      ];
      const csvContent = '﻿' + rows.map((r) => r.map((cell) => `"${cell}"`).join(';')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `Rapport_Exploitation_${dateStr}.csv`);
      toast.success(t('dash.export.csv_success'));
    } else if (format === 'EXCEL') {
      const channelRows = salesChannels
        .map((c) => `<tr><td>${c.name}</td><td>${formatMad(c.amount)}</td><td>${c.percent}%</td></tr>`)
        .join('');
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${t('dash.export.excel_sheet_name')}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body style="font-family: Arial, sans-serif;">
          <h2 style="color: #00875A;">${t('dash.export.excel_title')}</h2>
          <p><b>${t('dash.export.excel_event_label')}</b> ${eventName}</p>
          <p><b>${t('dash.export.excel_date_label')}</b> ${new Date().toLocaleString(locale)}</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #00875A; color: white;">
              <th>${t('dash.export.metric')}</th>
              <th>${t('dash.export.value')}</th>
              <th>${t('dash.export.details')}</th>
            </tr>
            <tr><td>${t('dash.export.excel_occupancy_rate')}</td><td>${occupancyPct}</td><td>${t('dash.kpi_occupancy_seats')}</td></tr>
            <tr><td>${t('dash.export.excel_total_revenue')}</td><td>${revenueStr}</td><td>${t('dash.kpi_revenue_avg_cart')}</td></tr>
            <tr><td>${t('dash.export.excel_unique_tickets')}</td><td>${uniqueTickets}</td><td>${t('dash.export.subscriber_cards_detail')}</td></tr>
            <tr><td>${t('dash.export.excel_scanned_entries')}</td><td>${scannedEntries}</td><td>${t('dash.kpi_access_valid')}</td></tr>
          </table>
          <h3 style="margin-top:20px;">${t('dash.export.excel_sales_by_channel')}</h3>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
            <tr style="background-color: #0F172A; color: white;"><th>${t('dash.export.excel_channel')}</th><th>${t('dash.export.amount_mad')}</th><th>${t('dash.export.excel_share')}</th></tr>
            ${channelRows}
          </table>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      downloadBlob(blob, `Rapport_Exploitation_${dateStr}.xlsx`);
      toast.success(t('dash.export.excel_success'));
    } else if (format === 'XML') {
      const channelXml = salesChannels
        .map((c) => `    <Channel name="${c.name}" amount="${c.amount}" percentage="${c.percent}" />`)
        .join('\n');
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ExploitationReport exportDate="${new Date().toISOString()}" system="E-Ticket Pro">
  <Event>
    <Name>${eventName}</Name>
    <Date>${dateStr}</Date>
  </Event>
  <Metrics>
    <OccupancyRate>${occupancyPct}</OccupancyRate>
    <SoldSeats>${dashboard.occupancy.soldSeats}</SoldSeats>
    <TotalCapacity>${dashboard.occupancy.totalSeats}</TotalCapacity>
    <TotalRevenueMad>${dashboard.revenue.total}</TotalRevenueMad>
    <ScannedEntries>${dashboard.access.entriesGranted}</ScannedEntries>
  </Metrics>
  <SalesChannels>
${channelXml}
  </SalesChannels>
</ExploitationReport>`;
      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
      downloadBlob(blob, `Rapport_Exploitation_${dateStr}.xml`);
      toast.success(t('dash.export.xml_success'));
    } else if (format === 'PDF') {
      const channelPdfRows = salesChannels
        .map((c) => `<tr><td>${c.name}</td><td>${c.count}</td><td>${c.percent}%</td><td>${formatMad(c.amount)}</td></tr>`)
        .join('');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${t('dash.export.pdf_page_title')}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #0f172a; }
              .header { border-bottom: 3px solid #00875A; padding-bottom: 15px; margin-bottom: 25px; }
              .brand { color: #00875A; font-weight: bold; font-size: 24px; }
              .title { font-size: 20px; margin-top: 10px; font-weight: bold; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
              .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
              .card-value { font-size: 28px; font-weight: 800; color: #0f172a; margin: 8px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
              th { background: #00875A; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">${t('dash.export.pdf_brand')}</div>
              <div class="title">${t('dash.export.pdf_title')}</div>
              <p style="font-size: 12px; color: #64748b;">${t('dash.export.pdf_event_label')} ${eventName} | ${t('dash.export.pdf_generated_on')} ${new Date().toLocaleString(locale)}</p>
            </div>
            <div class="grid">
              <div class="card">
                <div class="card-title">${t('dash.export.pdf_occupancy_title')}</div>
                <div class="card-value">${occupancyPct}</div>
                <div>${dashboard.occupancy.soldSeats.toLocaleString(locale)} / ${dashboard.occupancy.totalSeats.toLocaleString(locale)} ${t('dash.export.pdf_occupancy_detail')}</div>
              </div>
              <div class="card">
                <div class="card-title">${t('dash.export.pdf_revenue_title')}</div>
                <div class="card-value">${revenueStr}</div>
                <div>${avgCartStr ? `${t('dash.export.pdf_revenue_detail')}: ${avgCartStr}` : ''}</div>
              </div>
            </div>
            <h3>${t('dash.export.pdf_sales_breakdown_title')}</h3>
            <table>
              <thead>
                <tr><th>${t('dash.export.pdf_th_channel')}</th><th>${t('dash.export.pdf_th_tickets_sold')}</th><th>${t('dash.export.pdf_th_share')}</th><th>${t('dash.export.pdf_th_amount')}</th></tr>
              </thead>
              <tbody>
                ${channelPdfRows}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
        toast.success(t('dash.export.pdf_success'));
      }
    } else if (format === 'DOCX') {
      const channelRows = salesChannels.map(
        (c) =>
          new TableRow({
            children: [c.name, formatMad(c.amount), `${c.percent}%`].map(
              (text) => new TableCell({ children: [new Paragraph(text)], width: { size: 33, type: WidthType.PERCENTAGE } }),
            ),
          }),
      );
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: t('dash.export.pdf_brand'), heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ text: t('dash.export.pdf_title'), heading: HeadingLevel.HEADING_2 }),
              new Paragraph({
                children: [
                  new TextRun({ text: `${t('dash.export.pdf_event_label')} ${eventName}`, break: 1 }),
                  new TextRun({ text: `${t('dash.export.pdf_generated_on')} ${new Date().toLocaleString(locale)}`, break: 1 }),
                ],
              }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
              new Paragraph({ text: t('dash.export.pdf_occupancy_title'), heading: HeadingLevel.HEADING_3 }),
              new Paragraph({
                text: `${occupancyPct} — ${dashboard.occupancy.soldSeats.toLocaleString(locale)} / ${dashboard.occupancy.totalSeats.toLocaleString(locale)} ${t('dash.export.pdf_occupancy_detail')}`,
              }),
              new Paragraph({ text: t('dash.export.pdf_revenue_title'), heading: HeadingLevel.HEADING_3 }),
              new Paragraph({ text: avgCartStr ? `${revenueStr} (${t('dash.export.pdf_revenue_detail')}: ${avgCartStr})` : revenueStr }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
              new Paragraph({ text: t('dash.export.pdf_sales_breakdown_title'), heading: HeadingLevel.HEADING_3 }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [t('dash.export.pdf_th_channel'), t('dash.export.amount_mad'), t('dash.export.percentage')].map(
                      (text) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] }),
                    ),
                  }),
                  ...channelRows,
                ],
              }),
              new Paragraph({
                text: t('dash.export.docx_disclaimer'),
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
              }),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `Rapport_Exploitation_${dateStr}.docx`);
      toast.success(t('dash.export.docx_success'));
    }
  };

  // Export CRM r\u00E9el (module 7.3) : d\u00E9l\u00E8gue \u00E0 reports-service (m\u00EAmes routes d\u00E9j\u00E0
  // v\u00E9rifi\u00E9es sur la page Rapports) \u2014 plus de contacts fictifs g\u00E9n\u00E9r\u00E9s c\u00F4t\u00E9 client.
  const downloadCrm = useDownloadCrmExport();
  const handleCrmExport = () => {
    downloadCrm.mutate({ format: 'csv', eventId: activeEventId || undefined });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. En-tête de supervision, filtres et menu d'exportation multi-format */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t('dash.badge')}
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('dash.title')}
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('dash.desc')}
          </p>
        </div>

        {/* Action Bar : Sélecteur d'événement, Onglets Live/BI & Exports */}
        <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
          {publishedEvents.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/80">
              <CalendarDays className="h-4 w-4 text-[#00875A] ml-2 shrink-0" />
              <select
                value={activeEventId}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-xl border-0 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00875A] shadow-xs cursor-pointer"
              >
                {publishedEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('LIVE')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                activeTab === 'LIVE'
                  ? 'bg-gradient-to-r from-[#00875A] to-emerald-600 text-white shadow-md glow-emerald'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ⚡ {t('dash.live_stade')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BI')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                activeTab === 'BI'
                  ? 'bg-gradient-to-r from-[#00875A] to-emerald-600 text-white shadow-md glow-emerald'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📊 BI &amp; Marketing Analytics
            </button>
          </div>

          {/* Exportation Multi-Formats (Module 7.3) */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700/80 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>{t('dash.export_report')}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 hidden w-52 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-2 shadow-2xl group-hover:block z-50 transition-all">
              <button
                onClick={() => handleExport('PDF')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                <span>{t('dash.export_pdf')}</span>
              </button>
              <button
                onClick={() => handleExport('EXCEL')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <span>{t('dash.export_csv')}</span>
              </button>
              <button
                onClick={() => handleExport('XML')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                <span>{t('dash.export_xml')}</span>
              </button>
              <button
                onClick={() => handleExport('DOCX')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors"
              >
                <FileText className="h-4 w-4 text-indigo-500" />
                <span>{t('dash.export_docx')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cartes KPIs Opérationnelles (4 Métriques) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 : Remplissage */}
        <div className={`${CARD} glow-emerald`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dash.kpi_occupancy_title')}
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Users2 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {dashboard ? (
              <AnimatedNumber value={dashboard.occupancy.occupancyRate * 100} format={(v) => `${Math.round(v)}%`} />
            ) : (
              '—'
            )}
          </p>
          <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              {dashboard
                ? `${dashboard.occupancy.soldSeats.toLocaleString(locale)} / ${dashboard.occupancy.totalSeats.toLocaleString(locale)} ${t('dash.kpi_occupancy_seats')}`
                : '—'}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00875A] to-emerald-400 transition-all duration-700 shadow-sm"
              style={{ width: dashboard ? `${Math.min(100, dashboard.occupancy.occupancyRate * 100)}%` : '0%' }}
            />
          </div>
        </div>

        {/* KPI 2 : Recettes */}
        <div className={`${CARD} glow-amber`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dash.kpi_revenue_title')}
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {dashboard ? formatMad(dashboard.revenue.total) : '—'}
          </p>
          <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{avgCartStr ? `${t('dash.kpi_revenue_avg_cart')}: ${avgCartStr}` : '—'}</span>
          </div>
        </div>

        {/* KPI 3 : Billets */}
        <div className={`${CARD} glow-blue`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dash.kpi_tickets_title')}
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
              <Ticket className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {dashboard ? dashboard.tickets.active.toLocaleString(locale) : '—'}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{dashboard ? `${dashboard.tickets.total.toLocaleString(locale)} ${t('dash.kpi_tickets_unique')}` : '—'}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {dashboard ? `${dashboard.tickets.cancelled.toLocaleString(locale)} ${t('dash.kpi_tickets_cancelled')}` : ''}
            </span>
          </div>
        </div>

        {/* KPI 4 : Contrôle d'Accès */}
        <div className={`${CARD} glow-purple`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dash.kpi_access_title')}
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {dashboard ? dashboard.access.entriesGranted.toLocaleString(locale) : '—'}{' '}
            <span className="text-xs font-bold text-slate-400">{t('dash.kpi_access_scans')}</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {dashboard?.access.avgLatencyMs != null
                ? `${t('dash.kpi_access_speed_label')}: ${dashboard.access.avgLatencyMs}ms`
                : t('dash.kpi_access_valid')}
            </span>
            <span className="text-rose-500 font-bold">
              {accessRefusals !== null ? `${accessRefusals} ${t('dash.kpi_access_refusals')}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Vue 1 : Supervision Live Stade */}
      {activeTab === 'LIVE' ? (
        <>
          {/* Tribunes & Canaux */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className={`lg:col-span-7 ${CARD}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {t('dash.stand_occupancy_title')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('dash.stand_occupancy_desc')}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {standOccupancy.length} {t('dash.active_stands')}
                </span>
              </div>

              <div className="space-y-4">
                {standOccupancy.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">{t('dash.stand_occupancy_no_data')}</p>
                )}
                {standOccupancy.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                        {s.rate > 0.85 && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> {t('dash.high_traffic')}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">
                        {s.sold.toLocaleString()} / {s.total.toLocaleString()} · <span className="text-[#00875A] font-bold">{Math.round(s.rate * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                      <div
                        className={`h-full rounded-full ${s.rate > 0.85 ? 'bg-amber-500' : 'bg-[#00875A]'} transition-all duration-700`}
                        style={{ width: `${Math.min(100, s.rate * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`lg:col-span-5 ${CARD}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {t('dash.channel_breakdown_title')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('dash.channel_breakdown_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {salesChannels.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">{t('dash.channel.no_data')}</p>
                )}
                {salesChannels.map((c) => (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{formatMad(c.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{c.count}</span>
                      <span className="font-bold text-slate-700">
                        {c.percent}% {t('dash.of_revenue')}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${c.color} transition-all duration-700`} style={{ width: `${c.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Portes & Raccourcis */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className={`lg:col-span-7 ${CARD}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {t('dash.gate_log_title')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('dash.gate_log_desc')}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('dash.realtime')}
                </span>
              </div>

              <div className="space-y-2.5">
                {liveGateLogs.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">{t('dash.gate_log_no_data')}</p>
                )}
                {liveGateLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-xl p-3 text-sm transition-all ${
                      log.alert ? 'bg-red-50/80 border border-red-200' : 'bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {log.alert ? (
                        <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#00875A]" />
                      )}
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-800">{log.code}</span>
                        <p className="text-xs text-slate-500">{log.gate}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          log.status === 'VALIDE'
                            ? 'text-[#00875A]'
                            : log.status === 'DEJA_SCANNE'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {log.status === 'VALIDE'
                          ? t('dash.status_valid')
                          : log.status === 'DEJA_SCANNE'
                          ? t('dash.status_already_scanned')
                          : t('dash.status_invalid')}
                      </span>
                      <p className="text-[11px] font-medium text-slate-400">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`lg:col-span-5 ${CARD}`}>
              <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t('dash.quick_access_title')}
              </h2>
              <div className="space-y-2.5">
                <Link
                  href="/dashboard/pos"
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 transition-all hover:border-[#00875A] hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00875A]/10 text-[#00875A]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('dash.link_pos_title')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('dash.link_pos_desc')}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  href="/dashboard/access"
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 transition-all hover:border-[#00875A] hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                      <ScanLine className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('dash.link_access_title')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('dash.link_access_desc')}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  href="/dashboard/ticket-templates"
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 transition-all hover:border-[#00875A] hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                      <Palette className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('dash.link_templates_title')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('dash.link_templates_desc')}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  href="/dashboard/venues"
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 transition-all hover:border-[#00875A] hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('dash.link_venues_title')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('dash.link_venues_desc')}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Vue 2 : Business Intelligence & Marketing Analytics (Module 7.2) */
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <p className="text-xs font-semibold text-slate-600">
              {t('dash.bi_header_desc')}
            </p>
            <button
              onClick={handleCrmExport}
              className="flex items-center gap-2 rounded-xl bg-[#00875A] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#00754e] transition-all"
            >
              <Users className="h-4 w-4" />
              <span>{t('dash.bi_export_crm')}</span>
            </button>
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{t('dash.bi_geo_title')} & {t('dash.bi_age_title')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('dash.bi_analytics_unavailable')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
