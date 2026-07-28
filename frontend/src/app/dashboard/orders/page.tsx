'use client';

import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { OrderStatus, PaymentMethod } from '@/lib/order-types';

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  VOUCHER: 'Bon d’achat',
};

const statusBadge: Record<OrderStatus, { label: string; tone: 'green' | 'red' | 'amber' }> = {
  COMPLETED: { label: 'Complétée', tone: 'green' },
  CANCELLED: { label: 'Annulée', tone: 'red' },
  REFUNDED: { label: 'Remboursée', tone: 'amber' },
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export default function OrdersPage() {
  return (
    <RequirePermission permission="orders:read">
      <OrdersPageContent />
    </RequirePermission>
  );
}

function OrdersPageContent() {
  const [eventId, setEventId] = useState('');
  const { data: orders, isLoading, isError, error } = useOrders(eventId || undefined);
  const { data: events } = useEvents();
  const { data: channels } = useSalesChannels();

  const eventName = (id: string) => events?.find((e) => e.id === id)?.name ?? '—';
  const channelName = (id: string) => channels?.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Historique des ventes</h1>
          <p className="text-sm text-slate-500">Commandes passées au guichet, local ou distant.</p>
        </div>
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="max-w-xs">
          <option value="">Tous les événements</option>
          {(events ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `Impossible de charger l’historique : ${error.message}`
              : 'Impossible de charger l’historique. Réessayez plus tard.'
          }
        />
      ) : !orders?.length ? (
        <EmptyState message="Aucune vente enregistrée." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Événement</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Canal</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Billets</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Paiement</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-slate-500">{dateFormatter.format(new Date(order.createdAt))}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{eventName(order.eventId)}</td>
                    <td className="px-4 py-3 text-slate-500">{channelName(order.channelId)}</td>
                    <td className="px-4 py-3 text-slate-500">{order.items.length}</td>
                    <td className="px-4 py-3 text-slate-500">{paymentLabels[order.paymentMethod]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{priceFormatter.format(Number(order.totalAmount))}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusBadge[order.status].tone}>{statusBadge[order.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
