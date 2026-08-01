'use client';

import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTicketTemplate } from '@/hooks/useTicketTemplates';
import { useCancelTicket, useCodeImage, useCreateTicket, useReprintTicket, useTicket, useTickets } from '@/hooks/useTickets';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TicketPreview } from '@/components/templates/TicketPreview';

function buildDataSnapshot(values: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(values)) {
    if (!value) continue;
    const keys = path.split('.');
    let cursor = result;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        cursor[key] = value;
      } else {
        cursor[key] = (cursor[key] as Record<string, unknown>) ?? {};
        cursor = cursor[key] as Record<string, unknown>;
      }
    });
  }
  return result;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function GenerateTicketPage() {
  return (
    <RequirePermission permission="tickets:read">
      <GenerateTicketPageContent />
    </RequirePermission>
  );
}

function GenerateTicketPageContent() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const { data: template, isLoading, isError, error } = useTicketTemplate(templateId);
  const { data: tickets } = useTickets(templateId);
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('tickets:create');
  const canReprint = hasPermission('tickets:reprint');
  const canCancel = hasPermission('tickets:cancel');
  const { t } = useI18nStore();

  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [nfcTagId, setNfcTagId] = useState('');
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events } = useEvents();
  const [eventId, setEventId] = useState('');
  const selectedEvent = events?.find((e) => e.id === eventId);

  const { data: venue } = useVenueFullTree(selectedEvent?.venueId ?? '');
  const [standId, setStandId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [rowId, setRowId] = useState('');
  const [seatId, setSeatId] = useState('');

  const stands = venue?.stands ?? [];
  const zones = stands.find((s) => s.id === standId)?.zones ?? [];
  const rows = zones.find((z) => z.id === zoneId)?.rows ?? [];
  const availableSeats = (rows.find((r) => r.id === rowId)?.seats ?? []).filter((s) => s.status === 'AVAILABLE');

  const selectedStand = stands.find((s) => s.id === standId);
  const selectedZone = zones.find((z) => z.id === zoneId);
  const selectedRow = rows.find((r) => r.id === rowId);
  const selectedSeat = availableSeats.find((s) => s.id === seatId);
  const seatLabelText = selectedSeat
    ? `${selectedStand?.name ?? ''} · ${selectedZone?.name ?? ''} · ${t('templates.generate.row_label_prefix')} ${selectedRow?.label ?? ''} · ${t('templates.generate.seat_label_prefix')} ${
        selectedSeat.label ?? selectedSeat.number
      }`
    : '';

  const { data: orders } = useOrders();
  const buyerSuggestions = Array.from(
    new Set((orders ?? []).map((o) => o.buyerName).filter((n): n is string => !!n && n.trim().length > 0)),
  ).sort();
  const [buyerFullName, setBuyerFullName] = useState('');

  const bindings = Array.from(
    new Set((template?.elements ?? []).filter((e) => e.type === 'text' && e.binding).map((e) => e.binding as string)),
  );
  const usesEvent = bindings.some((b) => b.startsWith('event.'));
  const usesSeat = bindings.some((b) => b.startsWith('seat.'));
  const usesBuyerName = bindings.includes('buyer.fullName');
  const otherBindings = bindings.filter((b) => !b.startsWith('event.') && !b.startsWith('seat.') && b !== 'buyer.fullName');

  const onEventChange = (id: string) => {
    setEventId(id);
    setStandId('');
    setZoneId('');
    setRowId('');
    setSeatId('');
  };

  const liveSnapshot: Record<string, unknown> = buildDataSnapshot(otherValues);
  if (usesEvent && selectedEvent) {
    liveSnapshot.event = {
      id: selectedEvent.id,
      name: selectedEvent.name,
      startAt: selectedEvent.startAt,
      homeTeam: selectedEvent.homeTeam,
      awayTeam: selectedEvent.awayTeam,
    };
  }
  if (usesSeat && selectedSeat) {
    liveSnapshot.seat = { id: selectedSeat.id, label: seatLabelText, number: selectedSeat.number };
  }
  if (usesBuyerName && buyerFullName.trim()) {
    liveSnapshot.buyer = { fullName: buyerFullName.trim() };
  }

  const missingRequired =
    (usesEvent && !eventId) || (usesSeat && !seatId) || (usesBuyerName && !buyerFullName.trim());

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
            ? `${t('templates.generate.error_loading')}: ${error.message}`
            : t('templates.generate.error_loading_generic')
        }
      />
    );
  }

  if (!template) {
    return <EmptyState message={t('templates.generate.not_found')} />;
  }

  const onSubmit = () => {
    createTicket.mutate(
      {
        templateId,
        eventId: usesEvent && eventId ? eventId : undefined,
        seatId: usesSeat && selectedSeat ? selectedSeat.id : undefined,
        dataSnapshot: liveSnapshot,
        nfcTagId: nfcTagId || undefined,
      },
      {
        onSuccess: (ticket) => {
          setLastTicketId(ticket.id);
          if (usesSeat && selectedSeat) {
            queryClient.invalidateQueries({ queryKey: ['venues', selectedEvent?.venueId, 'full'] });
            setStandId('');
            setZoneId('');
            setRowId('');
            setSeatId('');
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/ticket-templates/${templateId}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('templates.generate.back_to_studio')}</span>
      </Link>

      {/* En-tête du générateur */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('templates.generate.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('templates.generate.title_prefix')} {template.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('templates.generate.desc')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
          <span className="h-2 w-2 rounded-full bg-[#00875A] animate-pulse" />
          {t('templates.generate.checksum_active')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {canCreate ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                {t('templates.generate.data_to_inject')}
              </h2>
              <div className="flex flex-col gap-3">
                {bindings.length === 0 && (
                  <p className="text-xs text-slate-400 font-medium">
                    {t('templates.generate.no_dynamic_field')}
                  </p>
                )}

                {usesEvent && (
                  <Select label={t('access.event_label')} value={eventId} onChange={(e) => onEventChange(e.target.value)} className="text-xs">
                    <option value="">{t('templates.generate.select_event')}</option>
                    {(events ?? []).map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} — {dateFormatter.format(new Date(ev.startAt))}
                      </option>
                    ))}
                  </Select>
                )}

                {usesBuyerName && (
                  <>
                    <Input
                      label={t('templates.generate.buyer_name_label')}
                      list="buyer-suggestions"
                      placeholder={t('templates.generate.buyer_name_placeholder')}
                      value={buyerFullName}
                      onChange={(e) => setBuyerFullName(e.target.value)}
                    />
                    <datalist id="buyer-suggestions">
                      {buyerSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </>
                )}

                {usesSeat && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">{t('templates.generate.numbered_seat')}</p>
                    {!eventId ? (
                      <p className="text-xs text-slate-400">{t('templates.generate.select_event_first')}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Select
                            value={standId}
                            onChange={(e) => {
                              setStandId(e.target.value);
                              setZoneId('');
                              setRowId('');
                              setSeatId('');
                            }}
                            className="text-xs"
                          >
                            <option value="">{t('templates.generate.stand_placeholder')}</option>
                            {stands.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </Select>
                          <Select
                            value={zoneId}
                            disabled={!standId}
                            onChange={(e) => {
                              setZoneId(e.target.value);
                              setRowId('');
                              setSeatId('');
                            }}
                            className="text-xs"
                          >
                            <option value="">{t('templates.generate.zone_placeholder')}</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </Select>
                          <Select
                            value={rowId}
                            disabled={!zoneId}
                            onChange={(e) => {
                              setRowId(e.target.value);
                              setSeatId('');
                            }}
                            className="text-xs"
                          >
                            <option value="">{t('templates.generate.row_placeholder')}</option>
                            {rows.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                          <Select value={seatId} disabled={!rowId} onChange={(e) => setSeatId(e.target.value)} className="text-xs">
                            <option value="">{t('templates.generate.available_seat_placeholder')}</option>
                            {availableSeats.map((seat) => (
                              <option key={seat.id} value={seat.id}>
                                {seat.label ?? `${t('templates.generate.seat_label_prefix')} ${seat.number}`}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {rowId && availableSeats.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600 font-semibold">
                            {t('templates.generate.no_available_seat')}
                          </p>
                        )}
                        {selectedSeat && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
                            {t('templates.generate.selected_label')} {seatLabelText}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {otherBindings.map((binding) => (
                  <Input
                    key={binding}
                    label={binding}
                    value={otherValues[binding] ?? ''}
                    onChange={(e) => setOtherValues((prev) => ({ ...prev, [binding]: e.target.value }))}
                  />
                ))}

                <Input
                  label={t('templates.generate.nfc_tag_label')}
                  placeholder={t('templates.generate.nfc_tag_placeholder')}
                  value={nfcTagId}
                  onChange={(e) => setNfcTagId(e.target.value)}
                />
                <Button
                  onClick={onSubmit}
                  isLoading={createTicket.isPending}
                  disabled={missingRequired}
                  className="mt-2 bg-[#00875A] text-white hover:bg-[#00754e]"
                >
                  <Printer className="h-4 w-4" />
                  <span>{t('templates.generate.generate_secure_ticket')}</span>
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState message={t('templates.generate.no_permission')} />
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('templates.generate.live_preview_title')}</h2>
            {lastTicketId && (
              <Button variant="ghost" onClick={() => setLastTicketId(null)} className="text-xs text-[#00875A]">
                + {t('templates.generate.generate_another')}
              </Button>
            )}
          </div>
          {lastTicketId ? (
            <GeneratedTicketPreview ticketId={lastTicketId} template={template} canReprint={canReprint} canCancel={canCancel} />
          ) : (
            <div className="overflow-auto rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200/80 dark:border-slate-800/80">
              <TicketPreview template={template} dataSnapshot={liveSnapshot} />
              <p className="mt-3 text-xs text-slate-400 text-center font-medium">
                {t('templates.generate.live_preview_hint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('templates.generate.issued_tickets_title')}
        </h2>
        {!tickets?.length ? (
          <EmptyState message={t('templates.generate.no_ticket_yet')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('templates.generate.th_secure_code')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('templates.generate.th_nfc_tag')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('templates.generate.th_reprints')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('templates.generate.th_issue_date')}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('ui.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tickets.map((ticket) => (
                    <Fragment key={ticket.id}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{ticket.code}</td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{ticket.nfcTagId ?? '—'}</td>
                        <td className="px-5 py-4">
                          {ticket.reprintCount > 0 ? (
                            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                              {ticket.reprintCount} {t('templates.generate.reprint_count')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{dateFormatter.format(new Date(ticket.createdAt))}</td>
                        <td className="px-5 py-4 text-right">
                          <Button variant="ghost" onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)} className="text-xs">
                            {expandedId === ticket.id ? t('templates.generate.hide') : t('templates.generate.inspect')}
                          </Button>
                        </td>
                      </tr>
                      {expandedId === ticket.id && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/80 dark:bg-slate-800/80 px-6 py-5">
                            <GeneratedTicketPreview ticketId={ticket.id} template={template} canReprint={canReprint} canCancel={canCancel} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratedTicketPreview({
  ticketId,
  template,
  canReprint,
  canCancel,
}: {
  ticketId: string;
  template: { width: number; height: number; backgroundColor: string; elements: import('@/lib/template-types').TemplateElement[] };
  canReprint: boolean;
  canCancel: boolean;
}) {
  const { data: ticket } = useTicket(ticketId);
  const { data: qr } = useCodeImage(ticketId, 'qrcode');
  const { data: barcode } = useCodeImage(ticketId, 'barcode');
  const reprint = useReprintTicket();
  const cancelTicket = useCancelTicket();
  const { t } = useI18nStore();

  if (!ticket) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="h-5 w-5 text-[#00875A]" />
      </div>
    );
  }

  const isCancelled = ticket.status === 'CANCELLED';

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <TicketPreview
          template={template}
          dataSnapshot={ticket.dataSnapshot}
          qrDataUrl={qr?.dataUrl}
          barcodeDataUrl={barcode?.dataUrl}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
        <div>
          <span>Code: <strong>{ticket.code}</strong></span>
          <span className="mx-2">·</span>
          <span>Checksum HMAC: <strong className="text-[#00875A]">{ticket.checksum}</strong></span>
        </div>
        {isCancelled && <Badge tone="red">{t('templates.generate.blacklisted')}</Badge>}
      </div>
      {!isCancelled && (
        <div className="flex flex-wrap gap-2 pt-1">
          {canReprint && (
            <Button variant="secondary" onClick={() => reprint.mutate(ticketId)} isLoading={reprint.isPending} className="text-xs">
              <RefreshCw className="h-4 w-4" />
              <span>{t('templates.generate.reprint_duplicate')}</span>
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" onClick={() => cancelTicket.mutate(ticketId)} isLoading={cancelTicket.isPending} className="text-xs text-red-600 hover:bg-red-50">
              <Ban className="h-4 w-4" />
              <span>{t('templates.generate.blacklist_cancel')}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


