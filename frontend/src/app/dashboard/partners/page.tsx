'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, Pencil, Plus, Search, ShieldAlert, ShieldCheck, Handshake, Radio, Activity, ExternalLink } from 'lucide-react';
import { useArchivePartner, usePartners, useSetPartnerStatus } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
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
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Partner | null | undefined>(undefined);
  const [toToggle, setToToggle] = useState<Partner | null>(null);
  const [toArchive, setToArchive] = useState<Partner | null>(null);

  const canCreate = hasPermission('partners:create');
  const canUpdate = hasPermission('partners:update');

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const total = partners?.length ?? 0;
    const active = partners?.filter((p) => p.status === 'ACTIVE').length ?? 0;
    const channelsCount = partners?.reduce((acc, p) => acc + (p.salesChannels?.length ?? 0), 0) ?? 0;
    return { total, active, channelsCount };
  }, [partners]);

  // Filtrage combiné par recherche et par statut
  const filteredPartners = useMemo(() => {
    return (partners ?? []).filter((p) => {
      const matchSearch =
        !search ||
        p.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (p.contactName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.email ?? '').toLowerCase().includes(search.toLowerCase());

      const matchStatus = !statusFilter || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [partners, search, statusFilter]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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
              {t('partners.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('partners.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('partners.desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/partners/archives"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Archive className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>{t('partners.archives_history')}</span>
          </Link>
          {canCreate && (
            <Button onClick={() => setEditing(null)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Plus className="h-4 w-4" />
              <span>{t('partners.new_partner_button')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('partners.kpi_total_label')}
            </span>
            <Handshake className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.total}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('partners.kpi_total_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('partners.kpi_active_label')}
            </span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#00875A]">{kpis.active}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('partners.kpi_active_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('partners.kpi_channels_label')}
            </span>
            <Radio className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.channelsCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('partners.kpi_channels_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('partners.kpi_network_label')}
            </span>
            <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-700">
            {t('partners.kpi_network_value')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('partners.kpi_network_sub')}
          </p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs sm:grid-cols-12">
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('partners.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>

        <div className="sm:col-span-4">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs">
            <option value="">{t('partners.all_statuses')}</option>
            <option value="ACTIVE">🟢 {t('partners.active_only')}</option>
            <option value="SUSPENDED">🔴 {t('partners.suspended_only')}</option>
          </Select>
        </div>
      </div>

      {/* Tableau des Partenaires */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : !filteredPartners.length ? (
        <EmptyState message={t('partners.no_match_criteria')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('partners.th_company')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('partners.th_contact')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('partners.th_channels')}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('partners.th_network_state')}
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('ui.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-extrabold text-xs text-[#00875A] ring-1 ring-emerald-200">
                          {getInitials(partner.companyName)}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/partners/${partner.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-[#00875A] transition-colors flex items-center gap-1.5"
                          >
                            <span>{partner.companyName}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                          </Link>
                          <p className="text-xs text-slate-400">ID: {partner.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{partner.contactName ?? '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{partner.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-700">
                        <Radio className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{partner.salesChannels?.length ?? 0} {t('partners.channel_count')}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {partner.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#00875A] animate-pulse" />
                          {t('partners.status_active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                          {t('partners.status_suspended')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canUpdate && (
                          <>
                            <Button
                              variant="ghost"
                              onClick={() => setEditing(partner)}
                              title={t('ui.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setToToggle(partner)}
                              title={partner.status === 'ACTIVE' ? t('partners.emergency_cutoff') : t('partners.reactivate_sales')}
                              className={partner.status === 'ACTIVE' ? 'hover:bg-red-50' : 'hover:bg-emerald-50'}
                            >
                              {partner.status === 'ACTIVE' ? (
                                <ShieldAlert className="h-4 w-4 text-red-600" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setToArchive(partner)}
                              title={t('partners.archive_partner')}
                            >
                              <Archive className="h-4 w-4 text-slate-500 dark:text-slate-400" />
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

      {/* Formulaires et Dialogues de Confirmation */}
      <PartnerFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} partner={editing} />

      <ConfirmDialog
        open={!!toToggle}
        title={toToggle?.status === 'ACTIVE' ? t('partners.confirm_cutoff_title') : t('partners.confirm_reactivate_title')}
        description={
          toToggle?.status === 'ACTIVE'
            ? `${t('partners.confirm_cutoff_desc_prefix')} "${toToggle?.companyName}" ${t('partners.confirm_cutoff_desc_suffix')}`
            : `${t('partners.confirm_reactivate_desc_prefix')} "${toToggle?.companyName}" ${t('partners.confirm_reactivate_desc_suffix')}`
        }
        confirmLabel={toToggle?.status === 'ACTIVE' ? t('partners.suspend_now') : t('partners.reactivate')}
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
        title={t('partners.confirm_archive_title')}
        description={`"${toArchive?.companyName}" ${t('partners.confirm_archive_desc_prefix')}`}
        confirmLabel={t('partners.archive_button')}
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


