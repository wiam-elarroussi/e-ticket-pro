'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Plus, Power, Trash2, Radio, Shield, BarChart2, KeyRound, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { usePartner, useGeneratePartnerApiKey } from '@/hooks/usePartners';
import { useSalesChannels, useSetSalesChannelActive } from '@/hooks/useSalesChannels';
import { useDeletePartnerQuota, usePartnerQuotas } from '@/hooks/usePartnerQuotas';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SalesChannelFormModal } from '@/components/partners/SalesChannelFormModal';
import { PartnerQuotaFormModal } from '@/components/partners/PartnerQuotaFormModal';
import { PartnerQuota } from '@/lib/types';
import { getSalesChannelTypeLabels } from '@/lib/sales-channel';
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
  const generateApiKey = useGeneratePartnerApiKey();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useI18nStore();

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<PartnerQuota | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canManageChannels = hasPermission('channels:manage');
  const canToggleChannels = hasPermission('channels:toggle');
  const canManageQuotas = hasPermission('quotas:manage');
  const canManagePartner = hasPermission('partners:update');

  const handleGenerateApiKey = () => {
    generateApiKey.mutate(partnerId, {
      onSuccess: (res) => {
        setRevealedApiKey(res.apiKey);
        setCopied(false);
      },
    });
  };

  const handleCopyApiKey = () => {
    if (!revealedApiKey) return;
    navigator.clipboard.writeText(revealedApiKey).then(() => {
      setCopied(true);
      toast.success(t('partners.detail.api_key_copied'));
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-[#00875A]" />
      </div>
    );
  }

  if (!partner) {
    return <EmptyState message={t('partners.detail.not_found')} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/partners"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('partners.detail.back_to_network')}</span>
      </Link>

      {/* En-tête Partenaire */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('partners.detail.profile_badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {partner.companyName}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('partners.detail.contact_label')} {partner.contactName ?? t('partners.detail.not_specified')} · {partner.email}
          </p>
        </div>

        <div>
          {partner.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-[#00875A] animate-pulse" />
              {t('partners.detail.active_partner')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              {t('partners.detail.sales_suspended')}
            </span>
          )}
        </div>
      </div>

      {/* Portail Partenaire (module 4) : émission de la clé API d'accès au tableau de bord en libre-service */}
      {canManagePartner && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('partners.detail.api_portal_title')}</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('partners.detail.api_portal_desc')}</p>

          {revealedApiKey ? (
            <div className="space-y-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 ring-1 ring-amber-200 dark:ring-amber-900">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{t('partners.detail.api_key_shown_once')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200">
                  {revealedApiKey}
                </code>
                <Button variant="secondary" onClick={handleCopyApiKey} className="!px-3">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleGenerateApiKey} isLoading={generateApiKey.isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <KeyRound className="h-4 w-4" />
              <span>{t('partners.detail.generate_api_key')}</span>
            </Button>
          )}
        </section>
      )}

      {/* Canaux de Vente */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('partners.detail.channels_title')}
            </h2>
          </div>
          {canManageChannels && (
            <Button onClick={() => setChannelModalOpen(true)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('salesChannels.new_channel_button')}</span>
            </Button>
          )}
        </div>

        {channelsLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !channels?.length ? (
          <EmptyState message={t('partners.detail.no_channels_linked')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_channel_name')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_channel_type')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_sales_window')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('events.th_sales_status')}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('sessions.th_emergency_action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {channels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{channel.name}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                          {getSalesChannelTypeLabels(t)[channel.type]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {channel.salesWindowStart && channel.salesWindowEnd
                          ? `${new Date(channel.salesWindowStart).toISOString().slice(11, 16)} – ${new Date(channel.salesWindowEnd).toISOString().slice(11, 16)}`
                          : t('salesChannels.permanent_247')}
                      </td>
                      <td className="px-5 py-4">
                        {channel.isActive ? (
                          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                            {t('ui.active')}
                          </span>
                        ) : (
                          <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                            {t('users.status_disabled')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canToggleChannels && (
                          <Button
                            variant={channel.isActive ? 'danger' : 'secondary'}
                            onClick={() => setChannelActive.mutate({ id: channel.id, isActive: !channel.isActive })}
                            isLoading={setChannelActive.isPending}
                          >
                            <Power className="h-4 w-4" />
                            <span>
                              {channel.isActive ? t('salesChannels.deactivate') : t('salesChannels.reactivate')}
                            </span>
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

      {/* Quotas Partenaire avec jauges visuelles % */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-[#00875A]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('partners.detail.quotas_title')}
            </h2>
          </div>
          {canManageQuotas && (
            <Button onClick={() => setQuotaModalOpen(true)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('partners.form.new_quota')}</span>
            </Button>
          )}
        </div>

        {quotasLoading ? (
          <Spinner className="h-5 w-5 text-[#00875A]" />
        ) : !quotas?.length ? (
          <EmptyState message={t('partners.detail.no_quotas')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_linked_channel')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_quota_usage')}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('partners.detail.th_fill_rate')}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('ui.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quotas.map((quota) => {
                    const channelName = channels?.find((c) => c.id === quota.salesChannelId)?.name;
                    const percent = Math.min(100, Math.round((quota.soldQuantity / quota.maxQuantity) * 100));

                    let barColor = 'bg-[#00875A]';
                    if (percent >= 80 && percent < 100) barColor = 'bg-amber-500';
                    if (percent >= 100) barColor = 'bg-red-600';

                    return (
                      <tr key={quota.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          {channelName ?? t('partners.detail.all_partner_channels')}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">{quota.soldQuantity}</span>
                          <span className="text-slate-400"> / {quota.maxQuantity} {t('partners.detail.tickets_label')}</span>
                        </td>
                        <td className="px-5 py-4 w-64">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">{percent}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {canManageQuotas && (
                            <Button variant="ghost" onClick={() => setQuotaToDelete(quota)} title={t('ui.delete')}>
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
        title={t('partners.detail.confirm_delete_quota_title')}
        description={t('partners.detail.confirm_delete_quota_desc')}
        confirmLabel={t('ui.delete')}
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


