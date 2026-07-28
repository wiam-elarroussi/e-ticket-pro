'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteEvent, useEvents } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { EventFormModal } from '@/components/events/EventFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Event, EventStatus, EventType } from '@/lib/event-types';

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

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function EventsPage() {
  return (
    <RequirePermission permission="events:read">
      <EventsPageContent />
    </RequirePermission>
  );
}

function EventsPageContent() {
  const { data: events, isLoading, isError, error } = useEvents();
  const { data: venues } = useVenues();
  const deleteEvent = useDeleteEvent();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [editing, setEditing] = useState<Event | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Event | null>(null);

  const canCreate = hasPermission('events:create');
  const canUpdate = hasPermission('events:update');
  const canDelete = hasPermission('events:delete');

  const venueName = (venueId: string) => venues?.find((v) => v.id === venueId)?.name ?? '—';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Événements</h1>
          <p className="text-sm text-slate-500">Programmation des matchs, compétitions et spectacles.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Nouvel événement
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
              ? `Impossible de charger les événements : ${error.message}`
              : 'Impossible de charger les événements. Réessayez plus tard.'
          }
        />
      ) : !events?.length ? (
        <EmptyState message="Aucun événement programmé." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Événement</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Enceinte</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Début</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/dashboard/events/${event.id}`} className="text-indigo-600 hover:text-indigo-500">
                        {event.name}
                      </Link>
                      {event.type === 'MATCH' && event.homeTeam && event.awayTeam && (
                        <p className="text-xs font-normal text-slate-400">
                          {event.homeTeam} vs {event.awayTeam}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{typeLabels[event.type]}</td>
                    <td className="px-4 py-3 text-slate-500">{venueName(event.venueId)}</td>
                    <td className="px-4 py-3 text-slate-500">{dateFormatter.format(new Date(event.startAt))}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusBadge[event.status].tone}>{statusBadge[event.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button variant="ghost" onClick={() => setEditing(event)} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" onClick={() => setToDelete(event)} title="Supprimer">
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

      <EventFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} event={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cet événement ?"
        description={`"${toDelete?.name}" sera supprimé définitivement.`}
        confirmLabel="Supprimer"
        isLoading={deleteEvent.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteEvent.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
