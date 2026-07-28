'use client';

import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Printer, RefreshCw } from 'lucide-react';
import { useTicketTemplate } from '@/hooks/useTicketTemplates';
import { useCancelTicket, useCodeImage, useCreateTicket, useReprintTicket, useTicket, useTickets } from '@/hooks/useTickets';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TicketPreview } from '@/components/templates/TicketPreview';

/** Construit un objet imbriqué à partir de chemins pointés (ex: "event.name" -> { event: { name } }). */
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

  // Bindings génériques (tout ce qui n'est pas event.*, seat.* ou buyer.fullName) restent en saisie libre.
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [nfcTagId, setNfcTagId] = useState('');
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // event.* : sélectionné dans la base des Événements.
  const { data: events } = useEvents();
  const [eventId, setEventId] = useState('');
  const selectedEvent = events?.find((e) => e.id === eventId);

  // seat.* : sélecteur en cascade (Tribune → Zone → Rang → Siège), scopé à l'enceinte de l'événement choisi,
  // limité aux sièges au statut AVAILABLE (repris du composant plan 2D du module 2).
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
    ? `${selectedStand?.name ?? ''} · ${selectedZone?.name ?? ''} · Rang ${selectedRow?.label ?? ''} · Siège ${
        selectedSeat.label ?? selectedSeat.number
      }`
    : '';

  // buyer.fullName : recherche/complétion sur les acheteurs déjà connus (agrégés depuis les ventes guichet du module 5 —
  // il n'existe pas de registre "clients" dédié, on réutilise donc les acheteurs déjà saisis lors de ventes précédentes).
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

  // Reconstruit systématiquement l'aperçu (avant même de générer réellement le billet) dès que
  // l'événement, l'acheteur et/ou le siège sont sélectionnés.
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
        <Spinner className="h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `Impossible de charger ce gabarit : ${error.message}`
            : 'Impossible de charger ce gabarit. Réessayez plus tard.'
        }
      />
    );
  }

  if (!template) {
    return <EmptyState message="Gabarit introuvable." />;
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
            // Le siège vient d'être marqué Vendu côté venue-service : on rafraîchit l'arborescence
            // et on efface la sélection pour éviter de le proposer une seconde fois.
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
    <div>
      <Link
        href={`/dashboard/ticket-templates/${templateId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au gabarit
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">Générer un billet — {template.name}</h1>
      <p className="mb-6 text-sm text-slate-500">
        Sélectionnez les données à injecter dans le gabarit ; un code sécurisé unique (QR + code-barres) est généré
        automatiquement.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {canCreate ? (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Données du billet</h2>
              <div className="flex flex-col gap-3">
                {bindings.length === 0 && (
                  <p className="text-sm text-slate-400">Ce gabarit n’a aucun champ dynamique — aucune donnée requise.</p>
                )}

                {usesEvent && (
                  <Select label="Événement" value={eventId} onChange={(e) => onEventChange(e.target.value)}>
                    <option value="">Sélectionner un événement…</option>
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
                      label="Acheteur"
                      list="buyer-suggestions"
                      placeholder="Rechercher un acheteur déjà connu ou saisir un nouveau nom"
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
                    <p className="mb-1.5 text-sm font-medium text-slate-700">Siège</p>
                    {!eventId ? (
                      <p className="text-sm text-slate-400">Sélectionnez d’abord un événement.</p>
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
                          >
                            <option value="">Tribune…</option>
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
                          >
                            <option value="">Zone…</option>
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
                          >
                            <option value="">Rang…</option>
                            {rows.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                          <Select value={seatId} disabled={!rowId} onChange={(e) => setSeatId(e.target.value)}>
                            <option value="">Siège libre…</option>
                            {availableSeats.map((seat) => (
                              <option key={seat.id} value={seat.id}>
                                {seat.label ?? `Siège ${seat.number}`}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {rowId && availableSeats.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600">Aucun siège libre sur ce rang.</p>
                        )}
                        {selectedSeat && <p className="mt-1 text-xs text-slate-400">Sélection : {seatLabelText}</p>}
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
                  label="Identifiant NFC/RFID (optionnel)"
                  placeholder="Badge/bracelet physique associé"
                  value={nfcTagId}
                  onChange={(e) => setNfcTagId(e.target.value)}
                />
                <Button onClick={onSubmit} isLoading={createTicket.isPending} disabled={missingRequired} className="mt-2">
                  <Printer className="h-4 w-4" />
                  Générer le billet
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState message="Vous n’avez pas les droits pour générer un billet." />
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Aperçu</h2>
            {lastTicketId && (
              <Button variant="ghost" onClick={() => setLastTicketId(null)}>
                Nouveau billet
              </Button>
            )}
          </div>
          {lastTicketId ? (
            <GeneratedTicketPreview ticketId={lastTicketId} template={template} canReprint={canReprint} canCancel={canCancel} />
          ) : (
            <div className="overflow-auto rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <TicketPreview template={template} dataSnapshot={liveSnapshot} />
              <p className="mt-2 text-xs text-slate-400">
                Aperçu en direct — le QR/code-barres définitif n’apparaît qu’après la génération réelle du billet.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-medium text-slate-900">Billets déjà générés pour ce gabarit</h2>
        {!tickets?.length ? (
          <EmptyState message="Aucun billet généré pour l’instant." />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">NFC/RFID</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Réimpressions</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Créé le</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <Fragment key={ticket.id}>
                      <tr>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{ticket.code}</td>
                        <td className="px-4 py-3 text-slate-500">{ticket.nfcTagId ?? '—'}</td>
                        <td className="px-4 py-3">
                          {ticket.reprintCount > 0 ? (
                            <Badge tone="amber">{ticket.reprintCount}</Badge>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{dateFormatter.format(new Date(ticket.createdAt))}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}>
                            {expandedId === ticket.id ? 'Masquer' : 'Voir'}
                          </Button>
                        </td>
                      </tr>
                      {expandedId === ticket.id && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50 px-4 py-4">
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

  if (!ticket) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="h-5 w-5 text-indigo-600" />
      </div>
    );
  }

  const isCancelled = ticket.status === 'CANCELLED';

  return (
    <div>
      <div className="mb-3 overflow-auto">
        <TicketPreview
          template={template}
          dataSnapshot={ticket.dataSnapshot}
          qrDataUrl={qr?.dataUrl}
          barcodeDataUrl={barcode?.dataUrl}
        />
      </div>
      <p className="mb-2 flex items-center gap-2 font-mono text-xs text-slate-500">
        Code : {ticket.code} · Checksum : {ticket.checksum}
        {ticket.reprintCount > 0 && ` · Réimprimé ${ticket.reprintCount} fois`}
        {isCancelled && <Badge tone="red">Annulé</Badge>}
      </p>
      {!isCancelled && (
        <div className="flex flex-wrap gap-2">
          {canReprint && (
            <Button variant="secondary" onClick={() => reprint.mutate(ticketId)} isLoading={reprint.isPending}>
              <RefreshCw className="h-4 w-4" />
              Réimprimer (billet perdu/invitation)
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" onClick={() => cancelTicket.mutate(ticketId)} isLoading={cancelTicket.isPending}>
              <Ban className="h-4 w-4 text-red-600" />
              Annuler (liste noire)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
