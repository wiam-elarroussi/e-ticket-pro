'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Archive, Pencil, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useArchivePartner, usePartners, useSetPartnerStatus } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PartnerFormModal } from '@/components/partners/PartnerFormModal';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Partner } from '@/lib/types';

export default function PartnersPage() {
  return (
    <RequirePermission permission="partners:read">
      <PartnersPageContent />
    </RequirePermission>
  );
}

function PartnersPageContent() {
  const { data: partners, isLoading } = usePartners();
  const setStatus = useSetPartnerStatus();
  const archivePartner = useArchivePartner();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [editing, setEditing] = useState<Partner | null | undefined>(undefined);
  const [toToggle, setToToggle] = useState<Partner | null>(null);
  const [toArchive, setToArchive] = useState<Partner | null>(null);

  const canCreate = hasPermission('partners:create');
  const canUpdate = hasPermission('partners:update');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Partenaires</h1>
          <p className="text-sm text-slate-500">Vendeurs externes, canaux de vente et quotas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/partners/archives"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <Archive className="h-4 w-4" />
            Archives / Historique
          </Link>
          {canCreate && (
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Nouveau partenaire
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : !partners?.length ? (
        <EmptyState message="Aucun partenaire." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Partenaire</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Canaux</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/partners/${partner.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                      {partner.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{partner.contactName ?? '—'}</p>
                    <p className="text-xs">{partner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{partner.salesChannels?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    {partner.status === 'ACTIVE' ? (
                      <Badge tone="green">Actif</Badge>
                    ) : (
                      <Badge tone="red">Suspendu</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <>
                          <Button variant="ghost" onClick={() => setEditing(partner)} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => setToToggle(partner)} title="Suspendre/Réactiver">
                            {partner.status === 'ACTIVE' ? (
                              <ShieldAlert className="h-4 w-4 text-red-600" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button variant="ghost" onClick={() => setToArchive(partner)} title="Archiver">
                            <Archive className="h-4 w-4 text-slate-500" />
                          </Button>
                        </>
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

      <PartnerFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} partner={editing} />

      <ConfirmDialog
        open={!!toToggle}
        title={toToggle?.status === 'ACTIVE' ? 'Suspendre ce partenaire ?' : 'Réactiver ce partenaire ?'}
        description={
          toToggle?.status === 'ACTIVE'
            ? `Toutes les ventes via les canaux de "${toToggle?.companyName}" seront bloquées immédiatement (kill-switch d'urgence).`
            : `Les canaux de vente actifs de "${toToggle?.companyName}" pourront de nouveau vendre.`
        }
        confirmLabel={toToggle?.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
        isLoading={setStatus.isPending}
        onClose={() => setToToggle(null)}
        onConfirm={() => {
          if (!toToggle) return;
          setStatus.mutate(
            { id: toToggle.id, status: toToggle.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
            { onSuccess: () => setToToggle(null) },
          );
        }}
      />

      <ConfirmDialog
        open={!!toArchive}
        title="Archiver ce partenaire ?"
        description={`"${toArchive?.companyName}" disparaîtra de la liste active et ses canaux de vente seront désactivés. Son historique (ventes, quotas) est conservé — retrouvez-le dans Archives / Historique, avec possibilité de restaurer ou de supprimer définitivement.`}
        confirmLabel="Archiver"
        isLoading={archivePartner.isPending}
        onClose={() => setToArchive(null)}
        onConfirm={() => {
          if (!toArchive) return;
          archivePartner.mutate(toArchive.id, { onSuccess: () => setToArchive(null) });
        }}
      />
    </div>
  );
}
