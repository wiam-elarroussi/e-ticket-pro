'use client';

import { useState } from 'react';
import { Plus, Power, Pencil } from 'lucide-react';
import { useSalesChannels, useSetSalesChannelActive } from '@/hooks/useSalesChannels';
import { usePartners } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SalesChannelFormModal } from '@/components/partners/SalesChannelFormModal';
import { salesChannelTypeLabels as channelTypeLabels } from '@/lib/sales-channel';
import { SalesChannel } from '@/lib/types';

export default function SalesChannelsPage() {
  return (
    <RequirePermission permission="channels:read">
      <SalesChannelsPageContent />
    </RequirePermission>
  );
}

function SalesChannelsPageContent() {
  const { data: channels, isLoading } = useSalesChannels();
  const { data: partners } = usePartners();
  const setChannelActive = useSetSalesChannelActive();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canManage = hasPermission('channels:manage');
  const canToggle = hasPermission('channels:toggle');

  const [modal, setModal] = useState<{ open: boolean; channel?: SalesChannel | null }>({ open: false });

  const partnerName = (partnerId: string | null) => {
    if (!partnerId) return null;
    return partners?.find((p) => p.id === partnerId)?.companyName ?? '—';
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Canaux de vente</h1>
        {canManage && (
          <Button onClick={() => setModal({ open: true, channel: null })}>
            <Plus className="h-4 w-4" />
            Nouveau canal
          </Button>
        )}
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Tous les canaux de vente, rattachés à un partenaire ou internes (guichets). Un canal doit être{' '}
        <span className="font-medium text-slate-700">actif</span> pour apparaître dans le sélecteur de la Vente rapide.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : !channels?.length ? (
        <EmptyState message="Aucun canal de vente. Créez au moins un canal interne (guichet) pour pouvoir encaisser en Vente rapide." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Partenaire</th>
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
                      {channel.partnerId ? (
                        partnerName(channel.partnerId)
                      ) : (
                        <Badge tone="indigo">Interne / guichet</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {channel.salesWindowStart && channel.salesWindowEnd
                        ? `${channel.salesWindowStart.slice(11, 16)} – ${channel.salesWindowEnd.slice(11, 16)}`
                        : '24h/24'}
                    </td>
                    <td className="px-4 py-3">
                      {channel.isActive ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Désactivé</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <Button variant="ghost" onClick={() => setModal({ open: true, channel })} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canToggle && (
                          <Button
                            variant={channel.isActive ? 'danger' : 'secondary'}
                            onClick={() => setChannelActive.mutate({ id: channel.id, isActive: !channel.isActive })}
                            isLoading={setChannelActive.isPending}
                          >
                            <Power className="h-4 w-4" />
                            {channel.isActive ? 'Désactiver' : 'Réactiver'}
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

      <SalesChannelFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        channel={modal.channel}
      />
    </div>
  );
}
