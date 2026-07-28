'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useSubscriptionFormula, useSetFormulaIncludedEvents } from '@/hooks/useSubscriptionFormulas';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { SubscriptionFormulaFormModal } from '@/components/subscriptions/SubscriptionFormulaFormModal';
import { SubscriptionFormModal } from '@/components/subscriptions/SubscriptionFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SubscriptionFormulaType, SubscriptionStatus, Subscription } from '@/lib/subscription-types';

const typeLabels: Record<SubscriptionFormulaType, string> = {
  SAISON: 'Saison',
  ELIMINATOIRES: 'Éliminatoires',
  POULES: 'Poules',
};

const statusBadge: Record<SubscriptionStatus, { label: string; tone: 'green' | 'amber' | 'red' }> = {
  ACTIVE: { label: 'Actif', tone: 'green' },
  SUSPENDED: { label: 'Suspendu', tone: 'amber' },
  CANCELLED: { label: 'Résilié', tone: 'red' },
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function SubscriptionFormulaDetailPage() {
  return (
    <RequirePermission permission="subscriptions:read">
      <SubscriptionFormulaDetailPageContent />
    </RequirePermission>
  );
}

function SubscriptionFormulaDetailPageContent() {
  const params = useParams<{ id: string }>();
  const formulaId = params.id;

  const { data: formula, isLoading, isError, error } = useSubscriptionFormula(formulaId);
  const { data: venueEvents } = useEvents(formula?.venueId);
  const { data: venue } = useVenueFullTree(formula?.venueId ?? '');
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions(formulaId);
  const setIncludedEvents = useSetFormulaIncludedEvents();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [editingFormula, setEditingFormula] = useState(false);
  const [subModal, setSubModal] = useState<{ open: boolean; subscription?: Subscription | null }>({ open: false });

  const canUpdate = hasPermission('subscriptions:update');
  const canCreate = hasPermission('subscriptions:create');

  useEffect(() => {
    if (formula?.includedEvents) {
      setSelectedEventIds(new Set(formula.includedEvents.map((e) => e.eventId)));
    }
  }, [formula?.includedEvents]);

  const initialEventIds = new Set(formula?.includedEvents?.map((e) => e.eventId) ?? []);
  const hasChanges =
    selectedEventIds.size !== initialEventIds.size ||
    Array.from(selectedEventIds).some((id) => !initialEventIds.has(id));

  const seatLabel = (seatId: string | null) => {
    if (!seatId || !venue) return seatId ?? '—';
    for (const s of venue.stands) {
      for (const z of s.zones) {
        for (const r of z.rows ?? []) {
          const seat = (r.seats ?? []).find((se) => se.id === seatId);
          if (seat) return `${s.name} · ${z.name} · ${r.label} · ${seat.label ?? `Siège ${seat.number}`}`;
        }
      }
    }
    return seatId;
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

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
            ? `Impossible de charger cette formule : ${error.message}`
            : 'Impossible de charger cette formule. Réessayez plus tard.'
        }
      />
    );
  }

  if (!formula) {
    return <EmptyState message="Formule introuvable." />;
  }

  return (
    <div>
      <Link
        href="/dashboard/subscription-formulas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux formules
      </Link>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{formula.name}</h1>
          <Badge tone="indigo">{typeLabels[formula.type]}</Badge>
          {formula.globalAccess && <Badge tone="green">Accès global (tous les événements)</Badge>}
          {canUpdate && (
            <Button variant="ghost" onClick={() => setEditingFormula(true)} title="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="text-slate-400">Prix : </span>
            {priceFormatter.format(Number(formula.price))}
          </p>
          <p>
            <span className="text-slate-400">Validité : </span>
            {dateFormatter.format(new Date(formula.validFrom))} → {dateFormatter.format(new Date(formula.validTo))}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <h2 className="font-medium text-slate-900">Calendrier inclus</h2>
        <p className="text-sm text-slate-500">
          {formula.globalAccess
            ? 'Accès global activé : cette formule donne déjà accès à tous les événements de l’enceinte, quel que soit ce calendrier — celui-ci ne sert que si l’accès global est désactivé.'
            : 'Événements de cette enceinte pour lesquels l’abonnement donne une entrée automatique.'}
        </p>
      </div>

      {!venueEvents?.length ? (
        <EmptyState message="Aucun événement programmé pour cette enceinte." />
      ) : (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {venueEvents.map((event) => (
              <label key={event.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  disabled={!canUpdate}
                  checked={selectedEventIds.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                />
                <span className="text-slate-700">{event.name}</span>
                <span className="text-xs text-slate-400">{dateFormatter.format(new Date(event.startAt))}</span>
              </label>
            ))}
          </div>
          {canUpdate && (
            <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
              <Button
                disabled={!hasChanges}
                isLoading={setIncludedEvents.isPending}
                onClick={() => setIncludedEvents.mutate({ id: formulaId, eventIds: Array.from(selectedEventIds) })}
              >
                Enregistrer le calendrier
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Cartes abonnés</h2>
        {canCreate && (
          <Button onClick={() => setSubModal({ open: true, subscription: null })}>
            <Plus className="h-4 w-4" />
            Nouvelle carte
          </Button>
        )}
      </div>

      {subsLoading ? (
        <Spinner className="h-5 w-5 text-indigo-600" />
      ) : !subscriptions?.length ? (
        <EmptyState message="Aucune carte abonné émise pour cette formule." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Titulaire</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Siège nominatif</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{sub.holderName}</td>
                    <td className="px-4 py-3 text-slate-500">{sub.holderEmail ?? sub.holderPhone ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{seatLabel(sub.seatId)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusBadge[sub.status].tone}>{statusBadge[sub.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate && (
                        <div className="flex justify-end">
                          <Button variant="ghost" onClick={() => setSubModal({ open: true, subscription: sub })} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubscriptionFormulaFormModal open={editingFormula} onClose={() => setEditingFormula(false)} formula={formula} />

      <SubscriptionFormModal
        open={subModal.open}
        onClose={() => setSubModal({ open: false })}
        formulaId={formulaId}
        venueId={formula.venueId}
        subscription={subModal.subscription}
      />
    </div>
  );
}
