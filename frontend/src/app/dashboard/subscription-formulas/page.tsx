'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteSubscriptionFormula, useSubscriptionFormulas } from '@/hooks/useSubscriptionFormulas';
import { useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { SubscriptionFormulaFormModal } from '@/components/subscriptions/SubscriptionFormulaFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SubscriptionFormula, SubscriptionFormulaType } from '@/lib/subscription-types';

const typeLabels: Record<SubscriptionFormulaType, string> = {
  SAISON: 'Saison',
  ELIMINATOIRES: 'Éliminatoires',
  POULES: 'Poules',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function SubscriptionFormulasPage() {
  return (
    <RequirePermission permission="subscriptions:read">
      <SubscriptionFormulasPageContent />
    </RequirePermission>
  );
}

function SubscriptionFormulasPageContent() {
  const { data: formulas, isLoading, isError, error } = useSubscriptionFormulas();
  const { data: venues } = useVenues();
  const deleteFormula = useDeleteSubscriptionFormula();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [editing, setEditing] = useState<SubscriptionFormula | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<SubscriptionFormula | null>(null);

  const canCreate = hasPermission('subscriptions:create');
  const canUpdate = hasPermission('subscriptions:update');
  const canDelete = hasPermission('subscriptions:delete');

  const venueName = (venueId: string) => venues?.find((v) => v.id === venueId)?.name ?? '—';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Formules d’abonnement</h1>
          <p className="text-sm text-slate-500">
            Pass saisonniers et abonnements permanents, avec calendrier d’événements inclus et cartes abonnés.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouvelle formule
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `Impossible de charger les formules : ${error.message}`
              : 'Impossible de charger les formules. Réessayez plus tard.'
          }
        />
      ) : !formulas?.length ? (
        <EmptyState message="Aucune formule d’abonnement." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formulas.map((formula) => (
            <div key={formula.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={`/dashboard/subscription-formulas/${formula.id}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  {formula.name}
                </Link>
                <Badge tone="indigo">{typeLabels[formula.type]}</Badge>
              </div>
              <p className="text-sm text-slate-500">{venueName(formula.venueId)}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{priceFormatter.format(Number(formula.price))}</p>
              <p className="mt-1 text-xs text-slate-400">
                {dateFormatter.format(new Date(formula.validFrom))} → {dateFormatter.format(new Date(formula.validTo))}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <Badge tone="slate">{formula._count?.subscriptions ?? 0} abonné(s)</Badge>
                {(canUpdate || canDelete) && (
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button variant="ghost" onClick={() => setEditing(formula)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" onClick={() => setToDelete(formula)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscriptionFormulaFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} formula={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette formule ?"
        description={`"${toDelete?.name}" sera supprimée. Impossible si des cartes abonnés y sont rattachées.`}
        confirmLabel="Supprimer"
        isLoading={deleteFormula.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteFormula.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
