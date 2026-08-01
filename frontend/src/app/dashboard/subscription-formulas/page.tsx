'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2, IdCard, Calendar, Users, ExternalLink } from 'lucide-react';
import { useDeleteSubscriptionFormula, useSubscriptionFormulas } from '@/hooks/useSubscriptionFormulas';
import { useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { SubscriptionFormulaFormModal } from '@/components/subscriptions/SubscriptionFormulaFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SubscriptionFormula, SubscriptionFormulaType } from '@/lib/subscription-types';

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
  const { t } = useI18nStore();

  const [editing, setEditing] = useState<SubscriptionFormula | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<SubscriptionFormula | null>(null);

  const canCreate = hasPermission('subscriptions:create');
  const canUpdate = hasPermission('subscriptions:update');
  const canDelete = hasPermission('subscriptions:delete');

  const venueName = (venueId: string) => venues?.find((v) => v.id === venueId)?.name ?? '—';

  const typeLabels: Record<SubscriptionFormulaType, string> = {
    SAISON: t('subscriptions.type_season_full'),
    ELIMINATOIRES: t('subscriptions.type_knockout'),
    POULES: t('subscriptions.type_group_stage'),
  };

  return (
    <div className="space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IdCard className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('subscriptions.list_badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('subscriptions.list_title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('subscriptions.list_desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('subscriptions.new_formula_button')}</span>
          </Button>
        )}
      </div>

      {/* Cartes des Formules */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('subscriptions.error_loading')}: ${error.message}`
              : t('subscriptions.error_loading_generic')
          }
        />
      ) : !formulas?.length ? (
        <EmptyState message={t('subscriptions.no_formula_configured')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {formulas.map((formula) => (
            <div key={formula.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                    {typeLabels[formula.type]}
                  </span>
                  <span className="font-extrabold text-[#00875A] text-lg">
                    {priceFormatter.format(Number(formula.price))}
                  </span>
                </div>

                <Link
                  href={`/dashboard/subscription-formulas/${formula.id}`}
                  className="mt-3 block font-extrabold text-slate-900 dark:text-white text-lg hover:text-[#00875A] transition-colors flex items-center gap-1.5"
                >
                  <span>{formula.name}</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Link>

                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('subscriptions.stadium_label')} {venueName(formula.venueId)}
                </p>

                <p className="mt-3 text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {t('subscriptions.validity_label')} {dateFormatter.format(new Date(formula.validFrom))} → {dateFormatter.format(new Date(formula.validTo))}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{formula._count?.subscriptions ?? 0} {t('subscriptions.subscriber_count')}</span>
                </span>
                {(canUpdate || canDelete) && (
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button variant="ghost" onClick={() => setEditing(formula)} title={t('ui.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" onClick={() => setToDelete(formula)} title={t('ui.delete')}>
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
        title={t('subscriptions.confirm_delete_title')}
        description={`"${toDelete?.name}" ${t('subscriptions.confirm_delete_desc')}`}
        confirmLabel={t('subscriptions.confirm_delete_button')}
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


