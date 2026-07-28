'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteVenue, useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { VenueFormModal } from '@/components/venues/VenueFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Venue } from '@/lib/venue-types';

export default function VenuesPage() {
  return (
    <RequirePermission permission="venues:read">
      <VenuesPageContent />
    </RequirePermission>
  );
}

function VenuesPageContent() {
  const { data: venues, isLoading, isError, error } = useVenues();
  const deleteVenue = useDeleteVenue();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [editing, setEditing] = useState<Venue | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Venue | null>(null);

  const canCreate = hasPermission('venues:create');
  const canUpdate = hasPermission('venues:update');
  const canDelete = hasPermission('venues:delete');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Enceintes</h1>
          <p className="text-sm text-slate-500">
            Sites multi-tribunes, cartographie 2D et arborescence des sièges.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouvelle enceinte
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
              ? `Impossible de charger les enceintes : ${error.message}`
              : 'Impossible de charger les enceintes. Réessayez plus tard.'
          }
        />
      ) : !venues?.length ? (
        <EmptyState message="Aucune enceinte." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <div key={venue.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <Link href={`/dashboard/venues/${venue.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                {venue.name}
              </Link>
              <p className="mt-1 text-sm text-slate-500">
                {[venue.city, venue.address].filter(Boolean).join(' · ') || 'Localisation non renseignée'}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {venue._count?.stands ?? 0} tribune(s) · {venue._count?.gates ?? 0} porte(s)
              </p>
              {(canUpdate || canDelete) && (
                <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setEditing(venue)} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" onClick={() => setToDelete(venue)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <VenueFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} venue={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette enceinte ?"
        description={`"${toDelete?.name}" et toute son arborescence (tribunes, zones, rangs, sièges, portes) seront supprimés définitivement. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isLoading={deleteVenue.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteVenue.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
