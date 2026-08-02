'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Trash2, Layout, Ticket, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { useDeleteTicketTemplate, useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { ApiError } from '@/lib/api-client';
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
  const { t } = useI18nStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TicketTemplate | null>(null);

  const canCreate = hasPermission('templates:create');
  const canDelete = hasPermission('templates:delete');

  // Métriques KPI calculées
  const kpis = useMemo(() => {
    const totalTemplates = templates?.length ?? 0;
    const totalGenerated = templates?.reduce((acc, t) => acc + (t._count?.generatedTickets ?? 0), 0) ?? 0;
    return { totalTemplates, totalGenerated };
  }, [templates]);

  // Filtrage combiné par recherche
  const filteredTemplates = useMemo(() => {
    return (templates ?? []).filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
    });
  }, [templates, search]);

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
              {t('templates.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('templates.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('templates.desc')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Plus className="h-4 w-4" />
            <span>{t('templates.new_template_button')}</span>
          </Button>
        )}
      </div>

      {/* Cartes KPI Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.kpi_total_label')}
            </span>
            <Layout className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {isError ? '—' : kpis.totalTemplates}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('templates.kpi_total_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.kpi_issued_label')}
            </span>
            <Ticket className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {isError ? '—' : kpis.totalGenerated}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('templates.kpi_issued_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.kpi_checksum_label')}
            </span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-700">
            {t('templates.kpi_checksum_value')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('templates.kpi_checksum_sub')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('templates.kpi_qr_label')}
            </span>
            <RefreshCw className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-purple-700">
            {t('templates.kpi_qr_value')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('templates.kpi_qr_sub')}
          </p>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('templates.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Liste des Gabarits */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : isError ? (
        <EmptyState
          message={
            error instanceof ApiError
              ? `${t('templates.error_loading')}: ${error.message}`
              : t('templates.error_loading_generic')
          }
        />
      ) : !filteredTemplates.length ? (
        <EmptyState message={t('templates.no_match_criteria')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all hover:shadow-md">
              <div>
                <div
                  className="mb-3 flex h-24 items-center justify-center rounded-xl ring-1 ring-inset ring-slate-200/80 dark:ring-slate-700/80 shadow-inner overflow-hidden relative"
                  style={{ backgroundColor: template.backgroundColor }}
                >
                  <div className="absolute inset-0 opacity-10 bg-slate-900" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-2xs">
                    {t('templates.format_label')} : {template.width}px × {template.height}px
                  </span>
                </div>

                <Link
                  href={`/dashboard/ticket-templates/${template.id}`}
                  className="font-extrabold text-slate-900 dark:text-white text-lg hover:text-[#00875A] transition-colors flex items-center gap-1.5"
                >
                  <span>{template.name}</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Link>

                {template.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Ticket className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{template._count?.generatedTickets ?? 0} {t('templates.ticket_count')}</span>
                </span>
                {canDelete && (
                  <Button variant="ghost" onClick={() => setToDelete(template)} title={t('templates.delete_template')}>
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
        title={t('templates.confirm_delete_title')}
        description={`"${toDelete?.name}" ${t('templates.confirm_delete_desc')}`}
        confirmLabel={t('templates.confirm_delete_button')}
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


