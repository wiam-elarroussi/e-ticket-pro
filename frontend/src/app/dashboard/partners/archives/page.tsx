'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react';
import { useArchivedPartners, useHardDeletePartner, useRestorePartner } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/format';
import { Partner } from '@/lib/types';
import { RequirePermission } from '@/components/auth/RequirePermission';

export default function ArchivedPartnersPage() {
  return (
    <RequirePermission permission="partners:read">
      <ArchivedPartnersPageContent />
    </RequirePermission>
  );
}

function ArchivedPartnersPageContent() {
  const { data: partners, isLoading } = useArchivedPartners();
  const restorePartner = useRestorePartner();
  const hardDeletePartner = useHardDeletePartner();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [toRestore, setToRestore] = useState<Partner | null>(null);
  const [toDelete, setToDelete] = useState<Partner | null>(null);

  const canUpdate = hasPermission('partners:update');
  const canDelete = hasPermission('partners:delete');

  return (
    <div>
      <Link
        href="/dashboard/partners"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux partenaires actifs
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Archives / Historique</h1>
        <p className="text-sm text-slate-500">
          Partenaires archivés : accès API et canaux de vente désactivés, historique conservé pour l’audit.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : !partners?.length ? (
        <EmptyState message="Aucun partenaire archivé." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Partenaire</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Canaux</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Archivé le</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Archivé par</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{partner.companyName}</p>
                    <p className="text-xs text-slate-400">{partner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {partner.salesChannels?.length ?? 0}
                    {(partner.salesChannels?.length ?? 0) > 0 && (
                      <span className="ml-2">
                        <Badge tone="slate">Désactivés</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {partner.archivedAt ? formatDateTime(partner.archivedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{partner.archivedBy?.fullName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button variant="secondary" onClick={() => setToRestore(partner)}>
                          <ArchiveRestore className="h-4 w-4" />
                          Restaurer
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="danger" onClick={() => setToDelete(partner)}>
                          <Trash2 className="h-4 w-4" />
                          Suppression définitive
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

      <ConfirmDialog
        open={!!toRestore}
        title="Restaurer ce partenaire ?"
        description={`"${toRestore?.companyName}" réapparaîtra dans la liste active. Ses canaux de vente restent désactivés : réactivez-les explicitement si besoin depuis sa fiche.`}
        confirmLabel="Restaurer"
        isLoading={restorePartner.isPending}
        onClose={() => setToRestore(null)}
        onConfirm={() => {
          if (!toRestore) return;
          restorePartner.mutate(toRestore.id, { onSuccess: () => setToRestore(null) });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer définitivement ce partenaire ?"
        description={`Action irréversible. Bloquée automatiquement si "${toDelete?.companyName}" possède le moindre historique de billets vendus ou de transactions (conformité des rapports d'audit).`}
        confirmLabel="Supprimer définitivement"
        isLoading={hardDeletePartner.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          hardDeletePartner.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
