'use client';

import { useMemo, useState } from 'react';
import { Search, DollarSign, ShoppingBag, CreditCard, CheckCircle2 } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { OrderStatus, PaymentMethod } from '@/lib/order-types';
import { formatMad } from '@/lib/format';
import { TranslationKey } from '@/store/i18n-store';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function OrdersPage() {
  return (
    <RequirePermission permission="orders:read">
      <OrdersPageContent />
    </RequirePermission>
  );
}

function OrdersPageContent() {
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const { t } = useI18nStore();

  const { data: orders, isLoading, isError, error } = useOrders(eventId || undefined);
  const { data: events } = useEvents();
  const { data: channels } = useSalesChannels();

  const eventName = (id: string) => events?.find((e) => e.id === id)?.name ?? '—';
  const channelName = (id: string) => channels?.find((c) => c.id === id)?.name ?? '—';

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const list = orders ?? [];
    const totalRevenue = list.filter((o) => o.status === 'COMPLETED').reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = list.length;
    const totalTickets = list.reduce((sum, o) => sum + o.items.length, 0);
    const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, totalTickets, avgBasket };
  }, [orders]);

  // Filtrage combiné par recherche
  const filteredOrders = useMemo(() => {
    return (orders ?? []).filter((o) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const bName = (o.buyerName ?? '').toLowerCase();
      const oId = o.id.toLowerCase();
      const cName = channelName(o.channelId).toLowerCase();
      const eName = eventName(o.eventId).toLowerCase();
      return bName.includes(q) || oId.includes(q) || cName.includes(q) || eName.includes(q);
    });
  }, [orders, search, events, channels]);

  const paymentLabels: Record<PaymentMethod, string> = {
    CASH: t('orders.payment_cash'),
    CARD: t('orders.payment_card'),
    VOUCHER: t('orders.payment_voucher'),
    ONLINE: t('orders.payment_online'),
    APPLE_PAY: t('orders.payment_apple_pay'),
    GOOGLE_PAY: t('orders.payment_google_pay'),
  };

  const statusBadge: Record<OrderStatus, { labelKey: TranslationKey; tone: 'green' | 'red' | 'amber' }> = {
    COMPLETED: { labelKey: 'orders.status_completed', tone: 'green' },
    CANCELLED: { labelKey: 'orders.status_cancelled', tone: 'red' },
    REFUNDED: { labelKey: 'orders.status_refunded', tone: 'amber' },
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('orders.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('orders.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('orders.desc')}
          </p>
        </div>

        <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="max-w-xs text-xs font-medium">
          <option value="">{t('orders.all_events')}</option>
          {(events ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('orders.kpi_revenue_label')}
            </span>
            <DollarSign className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{formatMad(kpis.totalRevenue)}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('orders.kpi_revenue_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('orders.kpi_orders_label')}
            </span>
            <ShoppingBag className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalOrders}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('orders.kpi_orders_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('orders.kpi_tickets_label')}
            </span>
            <CreditCard className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-purple-700">{kpis.totalTickets}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('orders.kpi_tickets_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('orders.kpi_avg_basket')}
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{formatMad(kpis.avgBasket)}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('orders.kpi_avg_basket_sub')}
          </p>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('orders.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Table des Ventes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('orders.error_loading')}: ${error.message}`
              : t('orders.error_loading_generic')
          }
        />
      ) : !filteredOrders.length ? (
        <EmptyState message={t('orders.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_datetime')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_buyer')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_event')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_channel')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_tickets')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_payment')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('orders.th_total')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{dateFormatter.format(new Date(order.createdAt))}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{order.buyerName || t('orders.desk_client')}</td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">{eventName(order.eventId)}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{channelName(order.channelId)}</td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">{order.items.length} {t('orders.ticket_count')}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{paymentLabels[order.paymentMethod]}</td>
                    <td className="px-5 py-4 font-extrabold text-[#00875A]">{formatMad(Number(order.totalAmount))}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusBadge[order.status].tone}>{t(statusBadge[order.status].labelKey)}</Badge>
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


