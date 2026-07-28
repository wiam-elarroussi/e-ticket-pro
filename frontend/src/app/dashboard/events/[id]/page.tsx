'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { useDeletePriceRule, usePriceRules } from '@/hooks/usePriceRules';
import { useDeleteSalesQuota, useSalesQuotas, useSetSalesQuotaStatus } from '@/hooks/useSalesQuotas';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PriceRuleFormModal } from '@/components/pricing/PriceRuleFormModal';
import { SalesQuotaFormModal } from '@/components/quotas/SalesQuotaFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EventStatus, EventType } from '@/lib/event-types';
import { PriceRule } from '@/lib/pricing-types';
import { SalesQuota } from '@/lib/quota-types';

const typeLabels: Record<EventType, string> = {
  MATCH: 'Match',
  COMPETITION: 'Compétition',
  SHOW: 'Spectacle',
};

const statusBadge: Record<EventStatus, { label: string; tone: 'green' | 'slate' | 'red' }> = {
  DRAFT: { label: 'Brouillon', tone: 'slate' },
  PUBLISHED: { label: 'Publié', tone: 'green' },
  CANCELLED: { label: 'Annulé', tone: 'red' },
};

const scopeLabels: Record<PriceRule['scope'], string> = {
  EVENT: "Tout l'événement",
  STAND: 'Tribune',
  ZONE: 'Zone',
  SEAT: 'Siège',
};

const quotaScopeLabels: Record<SalesQuota['scope'], string> = {
  EVENT: "Tout l'événement",
  STAND: 'Tribune',
  ZONE: 'Zone',
  CHANNEL: 'Canal de vente',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function EventDetailPage() {
  return (
    <RequirePermission permission="events:read">
      <EventDetailPageContent />
    </RequirePermission>
  );
}

function EventDetailPageContent() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const { data: event, isLoading, isError, error } = useEvent(eventId);
  const { data: venue } = useVenueFullTree(event?.venueId ?? '');
  const { data: categories } = useTicketCategories();
  const { data: priceRules, isLoading: rulesLoading } = usePriceRules(eventId);
  const deleteRule = useDeletePriceRule();
  const { data: salesQuotas, isLoading: quotasLoading } = useSalesQuotas(eventId);
  const { data: channels } = useSalesChannels();
  const setQuotaStatus = useSetSalesQuotaStatus();
  const deleteQuota = useDeleteSalesQuota();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [ruleModal, setRuleModal] = useState<{ open: boolean; rule?: PriceRule | null }>({ open: false });
  const [toDelete, setToDelete] = useState<PriceRule | null>(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<SalesQuota | null>(null);

  const canCreateRule = hasPermission('pricing:create');
  const canUpdateRule = hasPermission('pricing:update');
  const canDeleteRule = hasPermission('pricing:delete');
  const canManageQuotas = hasPermission('sales-quotas:manage');
  const canToggleQuotas = hasPermission('sales-quotas:toggle');

  const stands = venue?.stands ?? [];

  const targetLabel = (rule: PriceRule) => {
    if (rule.scope === 'EVENT') return '—';
    if (rule.scope === 'STAND') return stands.find((s) => s.id === rule.standId)?.name ?? rule.standId;
    if (rule.scope === 'ZONE') {
      for (const stand of stands) {
        const zone = stand.zones.find((z) => z.id === rule.zoneId);
        if (zone) return `${stand.name} / ${zone.name}`;
      }
      return rule.zoneId;
    }
    return rule.seatId;
  };

  const quotaTargetLabel = (quota: SalesQuota) => {
    if (quota.scope === 'EVENT') return '—';
    if (quota.scope === 'STAND') return stands.find((s) => s.id === quota.standId)?.name ?? quota.standId;
    if (quota.scope === 'ZONE') {
      for (const stand of stands) {
        const zone = stand.zones.find((z) => z.id === quota.zoneId);
        if (zone) return `${stand.name} / ${zone.name}`;
      }
      return quota.zoneId;
    }
    return channels?.find((c) => c.id === quota.channelId)?.name ?? quota.channelId;
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
            ? `Impossible de charger cet événement : ${error.message}`
            : 'Impossible de charger cet événement. Réessayez plus tard.'
        }
      />
    );
  }

  if (!event) {
    return <EmptyState message="Événement introuvable." />;
  }

  return (
    <div>
      <Link href="/dashboard/events" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Retour aux événements
      </Link>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{event.name}</h1>
          <Badge tone={statusBadge[event.status].tone}>{statusBadge[event.status].label}</Badge>
          <Badge tone="indigo">{typeLabels[event.type]}</Badge>
        </div>
        {event.type === 'MATCH' && event.homeTeam && event.awayTeam && (
          <p className="text-sm text-slate-500">
            {event.homeTeam} vs {event.awayTeam}
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="text-slate-400">Enceinte : </span>
            {venue?.name ?? '—'}
          </p>
          <p>
            <span className="text-slate-400">Début : </span>
            {dateFormatter.format(new Date(event.startAt))}
          </p>
          <p>
            <span className="text-slate-400">Fin : </span>
            {dateFormatter.format(new Date(event.endAt))}
          </p>
          {event.salesOpenAt && (
            <p>
              <span className="text-slate-400">Ventes ouvertes du : </span>
              {dateFormatter.format(new Date(event.salesOpenAt))}
              {event.salesCloseAt && ` au ${dateFormatter.format(new Date(event.salesCloseAt))}`}
            </p>
          )}
          {event.maxPerOrder && (
            <p>
              <span className="text-slate-400">Max par panier : </span>
              {event.maxPerOrder} billet(s)
            </p>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Grille tarifaire</h2>
        {canCreateRule && (
          <Button
            onClick={() => setRuleModal({ open: true, rule: null })}
            disabled={!categories?.length}
            title={!categories?.length ? "Créez d'abord une catégorie de billet" : undefined}
          >
            <Plus className="h-4 w-4" />
            Nouvelle règle tarifaire
          </Button>
        )}
      </div>

      {!categories?.length && (
        <p className="mb-3 text-sm text-amber-600">
          Aucune catégorie de billet configurée.{' '}
          <Link href="/dashboard/ticket-categories" className="underline">
            Créez-en une
          </Link>{' '}
          avant de définir des tarifs.
        </p>
      )}

      {rulesLoading ? (
        <Spinner className="h-5 w-5 text-indigo-600" />
      ) : !priceRules?.length ? (
        <EmptyState message="Aucune règle tarifaire pour cet événement." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Catégorie</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Portée</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Cible</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Prix</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Validité</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{rule.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{scopeLabels[rule.scope]}</td>
                    <td className="px-4 py-3 text-slate-500">{targetLabel(rule)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{priceFormatter.format(Number(rule.price))}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {rule.validFrom || rule.validTo ? (
                        <>
                          {rule.validFrom ? dateFormatter.format(new Date(rule.validFrom)) : '…'}
                          {' → '}
                          {rule.validTo ? dateFormatter.format(new Date(rule.validTo)) : '…'}
                        </>
                      ) : (
                        'Toujours'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canUpdateRule && (
                          <Button variant="ghost" onClick={() => setRuleModal({ open: true, rule })} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteRule && (
                          <Button variant="ghost" onClick={() => setToDelete(rule)} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Jauges de vente</h2>
        {canManageQuotas && (
          <Button onClick={() => setQuotaModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle jauge
          </Button>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Plafonds de billets et blocage/déblocage instantané de la vente par tribune, zone ou canal de vente.
      </p>

      {quotasLoading ? (
        <Spinner className="h-5 w-5 text-indigo-600" />
      ) : !salesQuotas?.length ? (
        <EmptyState message="Aucune jauge de vente pour cet événement." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Portée</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Cible</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Catégorie</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Plafond</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesQuotas.map((quota) => (
                  <tr key={quota.id}>
                    <td className="px-4 py-3 text-slate-500">{quotaScopeLabels[quota.scope]}</td>
                    <td className="px-4 py-3 text-slate-500">{quotaTargetLabel(quota)}</td>
                    <td className="px-4 py-3 text-slate-500">{quota.category?.name ?? 'Toutes'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{quota.maxQuantity ?? 'Illimité'}</td>
                    <td className="px-4 py-3">
                      {quota.isBlocked ? <Badge tone="red">Bloquée</Badge> : <Badge tone="green">Ouverte</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canToggleQuotas && (
                          <Button
                            variant="ghost"
                            onClick={() => setQuotaStatus.mutate({ id: quota.id, isBlocked: !quota.isBlocked })}
                            title={quota.isBlocked ? 'Débloquer la vente' : 'Bloquer la vente'}
                          >
                            {quota.isBlocked ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        )}
                        {canManageQuotas && (
                          <Button variant="ghost" onClick={() => setQuotaToDelete(quota)} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PriceRuleFormModal
        open={ruleModal.open}
        onClose={() => setRuleModal({ open: false })}
        eventId={eventId}
        categories={categories ?? []}
        stands={stands}
        rule={ruleModal.rule}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette règle tarifaire ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={deleteRule.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteRule.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />

      <SalesQuotaFormModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        eventId={eventId}
        categories={categories ?? []}
        stands={stands}
      />

      <ConfirmDialog
        open={!!quotaToDelete}
        title="Supprimer cette jauge ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={deleteQuota.isPending}
        onClose={() => setQuotaToDelete(null)}
        onConfirm={() => {
          if (!quotaToDelete) return;
          deleteQuota.mutate(quotaToDelete.id, { onSuccess: () => setQuotaToDelete(null) });
        }}
      />
    </div>
  );
}
