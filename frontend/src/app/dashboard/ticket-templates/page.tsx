'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { useDeleteTicketTemplate, useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { TicketTemplateFormModal } from '@/components/templates/TicketTemplateFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TicketTemplate } from '@/lib/template-types';

export default function TicketTemplatesPage() {
  return (
    <RequirePermission permission="templates:read">
      <TicketTemplatesPageContent />
    </RequirePermission>
  );
}

function TicketTemplatesPageContent() {
  const router = useRouter();
  const { data: templates, isLoading, isError, error } = useTicketTemplates();
  const deleteTemplate = useDeleteTicketTemplate();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TicketTemplate | null>(null);

  const canCreate = hasPermission('templates:create');
  const canDelete = hasPermission('templates:delete');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gabarits de billets</h1>
          <p className="text-sm text-slate-500">
            Modèles graphiques (couleurs, logos, sponsors) avec injection automatique des données.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau gabarit
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
              ? `Impossible de charger les gabarits : ${error.message}`
              : 'Impossible de charger les gabarits. Réessayez plus tard.'
          }
        />
      ) : !templates?.length ? (
        <EmptyState message="Aucun gabarit de billet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div
                className="mb-3 flex h-20 items-center justify-center rounded-md ring-1 ring-inset ring-slate-200"
                style={{ backgroundColor: template.backgroundColor }}
              >
                <span className="text-xs text-slate-400">
                  {template.width}×{template.height}
                </span>
              </div>
              <Link
                href={`/dashboard/ticket-templates/${template.id}`}
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {template.name}
              </Link>
              {template.description && <p className="mt-1 text-sm text-slate-500">{template.description}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <Badge tone="slate">{template._count?.generatedTickets ?? 0} billet(s) généré(s)</Badge>
                {canDelete && (
                  <Button variant="ghost" onClick={() => setToDelete(template)} title="Supprimer">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketTemplateFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => router.push(`/dashboard/ticket-templates/${id}`)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce gabarit ?"
        description={`"${toDelete?.name}" sera supprimé. Impossible si des billets ont déjà été générés à partir de ce gabarit.`}
        confirmLabel="Supprimer"
        isLoading={deleteTemplate.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteTemplate.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
