'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Plus, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePartner } from '@/hooks/usePartners';
import { useSalesChannels, useSetSalesChannelActive } from '@/hooks/useSalesChannels';
import { useDeletePartnerQuota, usePartnerQuotas } from '@/hooks/usePartnerQuotas';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SalesChannelFormModal } from '@/components/partners/SalesChannelFormModal';
import { PartnerQuotaFormModal } from '@/components/partners/PartnerQuotaFormModal';
import { PartnerQuota } from '@/lib/types';
import { salesChannelTypeLabels as channelTypeLabels } from '@/lib/sales-channel';
import { RequirePermission } from '@/components/auth/RequirePermission';

export default function PartnerDetailPage() {
  return (
    <RequirePermission permission="partners:read">
      <PartnerDetailPageContent />
    </RequirePermission>
  );
}

function PartnerDetailPageContent() {
  const params = useParams<{ id: string }>();
  const partnerId = params.id;

  const { data: partner, isLoading } = usePartner(partnerId);
  const { data: channels, isLoading: channelsLoading } = useSalesChannels(partnerId);
  const { data: quotas, isLoading: quotasLoading } = usePartnerQuotas(partnerId);
  const setChannelActive = useSetSalesChannelActive();
  const deleteQuota = useDeletePartnerQuota();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<PartnerQuota | null>(null);

  const canManageChannels = hasPermission('channels:manage');
  const canToggleChannels = hasPermission('channels:toggle');
  const canManageQuotas = hasPermission('quotas:manage');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  if (!partner) {
    return <EmptyState message="Partenaire introuvable." />;
  }

  return (
    <div>
      <Link href="/dashboard/partners" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Retour aux partenaires
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{partner.companyName}</h1>
        {partner.status === 'ACTIVE' ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Suspendu</Badge>}
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Canaux de vente</h2>
          {canManageChannels && (
            <Button onClick={() => setChannelModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau canal
            </Button>
          )}
        </div>

        {channelsLoading ? (
          <Spinner className="h-5 w-5 text-indigo-600" />
        ) : !channels?.length ? (
          <EmptyState message="Aucun canal de vente pour ce partenaire." />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Plage horaire</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channels.map((channel) => (
                  <tr key={channel.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{channel.name}</td>
                    <td className="px-4 py-3 text-slate-500">{channelTypeLabels[channel.type]}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {channel.salesWindowStart && channel.salesWindowEnd
                        ? `${new Date(channel.salesWindowStart).toISOString().slice(11, 16)} – ${new Date(
                            channel.salesWindowEnd,
                          )
                            .toISOString()
                            .slice(11, 16)}`
                        : '24h/24'}
                    </td>
                    <td className="px-4 py-3">
                      {channel.isActive ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Désactivé</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canToggleChannels && (
                        <Button
                          variant={channel.isActive ? 'danger' : 'secondary'}
                          onClick={() => setChannelActive.mutate({ id: channel.id, isActive: !channel.isActive })}
                          isLoading={setChannelActive.isPending}
                        >
                          <Power className="h-4 w-4" />
                          {channel.isActive ? 'Désactiver' : 'Réactiver'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Quotas</h2>
          {canManageQuotas && (
            <Button onClick={() => setQuotaModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau quota
            </Button>
          )}
        </div>

        {quotasLoading ? (
          <Spinner className="h-5 w-5 text-indigo-600" />
        ) : !quotas?.length ? (
          <EmptyState message="Aucun quota défini pour ce partenaire." />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Canal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Utilisé / Max</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotas.map((quota) => {
                  const channelName = channels?.find((c) => c.id === quota.salesChannelId)?.name;
                  return (
                    <tr key={quota.id}>
                      <td className="px-4 py-3 text-slate-700">{channelName ?? 'Tous les canaux'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {quota.soldQuantity} / {quota.maxQuantity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManageQuotas && (
                          <Button variant="ghost" onClick={() => setQuotaToDelete(quota)} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      <SalesChannelFormModal open={channelModalOpen} onClose={() => setChannelModalOpen(false)} partnerId={partnerId} />

      <PartnerQuotaFormModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        partnerId={partnerId}
        channels={channels ?? []}
      />

      <ConfirmDialog
        open={!!quotaToDelete}
        title="Supprimer ce quota ?"
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
