'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Tag, UserCheck } from 'lucide-react';
import { useDeleteTicketCategory, useTicketCategories } from '@/hooks/useTicketCategories';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { TicketCategoryFormModal } from '@/components/pricing/TicketCategoryFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TicketCategory } from '@/lib/pricing-types';

export default function TicketCategoriesPage() {
  return (
    <RequirePermission permission="pricing:read">
      <TicketCategoriesPageContent />
    </RequirePermission>
  );
}

function TicketCategoriesPageContent() {
  const { data: categories, isLoading, isError, error } = useTicketCategories();
  const deleteCategory = useDeleteTicketCategory();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TicketCategory | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<TicketCategory | null>(null);

  const canCreate = hasPermission('pricing:create');
  const canUpdate = hasPermission('pricing:update');
  const canDelete = hasPermission('pricing:delete');

  const filteredCategories = useMemo(() => {
    return (categories ?? []).filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [categories, search]);

  return (
    <div className="space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('ticketCategories.catalog_badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('ticketCategories.page_title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('ticketCategories.page_desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('ticketCategories.new_category_button')}</span>
          </Button>
        )}
      </div>

      {/* Barre de Recherche */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('ticketCategories.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Cartes des Catégories */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('ticketCategories.error_loading')}: ${error.message}`
              : t('ticketCategories.error_loading_generic')
          }
        />
      ) : !filteredCategories.length ? (
        <EmptyState message={t('ticketCategories.no_match_criteria')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <div key={category.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                    {category.code}
                  </span>
                  {category.isFree && (
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                      {t('ticketCategories.free_badge')}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white text-lg">{category.name}</h3>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {category.requiresNominativeInfo ? (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-amber-200">
                      <UserCheck className="h-3.5 w-3.5" />
                      {t('ticketCategories.nominative_ticket_badge')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">{t('ticketCategories.standard_ticket_badge')}</span>
                  )}
                  {category.accreditationType !== 'PUBLIC' && (
                    <span className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md ring-1 ring-purple-200">
                      {t(`pricing.accreditation.${category.accreditationType.toLowerCase()}` as TranslationKey)}
                    </span>
                  )}
                </div>
              </div>

              {(canUpdate || canDelete) && (
                <div className="mt-4 flex justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setEditing(category)} title={t('ui.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" onClick={() => setToDelete(category)} title={t('ui.delete')}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TicketCategoryFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} category={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('ticketCategories.confirm_delete_title')}
        description={`"${toDelete?.name}" ${t('ticketCategories.confirm_delete_desc')}`}
        confirmLabel={t('ticketCategories.confirm_delete_button')}
        isLoading={deleteCategory.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteCategory.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}


