'use client';

import { useMemo, useState } from 'react';
import { Plus, Power, Pencil, Globe, Radio, ShieldCheck, Search } from 'lucide-react';
import { useSalesChannels, useSetSalesChannelActive } from '@/hooks/useSalesChannels';
import { usePartners } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SalesChannelFormModal } from '@/components/partners/SalesChannelFormModal';
import { getSalesChannelTypeLabels } from '@/lib/sales-channel';
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
  const { t } = useI18nStore();

  const canManage = hasPermission('channels:manage');
  const canToggle = hasPermission('channels:toggle');

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; channel?: SalesChannel | null }>({ open: false });

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const list = channels ?? [];
    const total = list.length;
    const active = list.filter((c) => c.isActive).length;
    const internal = list.filter((c) => !c.partnerId).length;
    const remote = list.filter((c) => !!c.partnerId).length;
    return { total, active, internal, remote };
  }, [channels]);

  // Filtrage combiné par recherche
  const filteredChannels = useMemo(() => {
    return (channels ?? []).filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const pName = (partners?.find((p) => p.id === c.partnerId)?.companyName ?? '').toLowerCase();
      return c.name.toLowerCase().includes(q) || pName.includes(q);
    });
  }, [channels, search, partners]);

  const partnerName = (partnerId: string | null) => {
    if (!partnerId) return null;
    return partners?.find((p) => p.id === partnerId)?.companyName ?? '—';
  };

  return (
    <div className="space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('salesChannels.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('salesChannels.page_title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('salesChannels.page_desc')}
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setModal({ open: true, channel: null })} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('salesChannels.new_channel_button')}</span>
          </Button>
        )}
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('salesChannels.kpi_total_label')}
            </span>
            <Globe className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.total}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('salesChannels.kpi_total_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('salesChannels.kpi_active_label')}
            </span>
            <Radio className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{kpis.active}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('salesChannels.kpi_active_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('salesChannels.kpi_internal_label')}
            </span>
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.internal}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('salesChannels.kpi_internal_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('salesChannels.kpi_remote_label')}
            </span>
            <Globe className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-purple-700">{kpis.remote}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('salesChannels.kpi_remote_sub')}</p>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('salesChannels.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Table des Canaux de Vente */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : !filteredChannels?.length ? (
        <EmptyState message={t('salesChannels.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('salesChannels.th_name')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('salesChannels.th_sales_type')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('salesChannels.th_linked_partner')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('salesChannels.th_time_window')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.status')}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{channel.name}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{getSalesChannelTypeLabels(t)[channel.type]}</td>
                    <td className="px-5 py-4 text-xs font-bold">
                      {channel.partnerId ? (
                        <span className="text-slate-800 dark:text-slate-100">{partnerName(channel.partnerId)}</span>
                      ) : (
                        <Badge tone="indigo">{t('salesChannels.internal_desk')}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {channel.salesWindowStart && channel.salesWindowEnd
                        ? `${channel.salesWindowStart.slice(11, 16)} – ${channel.salesWindowEnd.slice(11, 16)}`
                        : t('salesChannels.permanent_247')}
                    </td>
                    <td className="px-5 py-4">
                      {channel.isActive ? (
                        <Badge tone="green">{t('ui.active')}</Badge>
                      ) : (
                        <Badge tone="red">{t('ui.inactive')}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <Button variant="ghost" onClick={() => setModal({ open: true, channel })} title={t('ui.edit')} className="text-xs">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canToggle && (
                          <Button
                            variant={channel.isActive ? 'danger' : 'secondary'}
                            className="text-xs font-bold"
                            onClick={() => setChannelActive.mutate({ id: channel.id, isActive: !channel.isActive })}
                            isLoading={setChannelActive.isPending}
                          >
                            <Power className="h-4 w-4" />
                            <span>
                              {channel.isActive ? t('salesChannels.deactivate') : t('salesChannels.reactivate')}
                            </span>
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


