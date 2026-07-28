'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteTicketCategory, useTicketCategories } from '@/hooks/useTicketCategories';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
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

  const [editing, setEditing] = useState<TicketCategory | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<TicketCategory | null>(null);

  const canCreate = hasPermission('pricing:create');
  const canUpdate = hasPermission('pricing:update');
  const canDelete = hasPermission('pricing:delete');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Catégories de billets</h1>
          <p className="text-sm text-slate-500">
            Catalogue réutilisable pour toutes les grilles tarifaires (Plein Tarif, Enfant, VIP, Presse…).
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
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
              ? `Impossible de charger les catégories : ${error.message}`
              : 'Impossible de charger les catégories. Réessayez plus tard.'
          }
        />
      ) : !categories?.length ? (
        <EmptyState message="Aucune catégorie de billet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{category.name}</h3>
                {category.isFree && <Badge tone="green">Gratuite</Badge>}
              </div>
              <p className="font-mono text-xs text-slate-400">{category.code}</p>
              <p className="mb-4 text-xs text-amber-600">{category.requiresNominativeInfo ? 'Billet nominatif' : ' '}</p>
              {(canUpdate || canDelete) && (
                <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setEditing(category)} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" onClick={() => setToDelete(category)} title="Supprimer">
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
        title="Supprimer cette catégorie ?"
        description={`"${toDelete?.name}" sera supprimée. Impossible si des règles tarifaires l'utilisent encore.`}
        confirmLabel="Supprimer"
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
