'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react';
import { useArchivedPartners, useHardDeletePartner, useRestorePartner } from '@/hooks/usePartners';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
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
  const { t } = useI18nStore();

  const [toRestore, setToRestore] = useState<Partner | null>(null);
  const [toDelete, setToDelete] = useState<Partner | null>(null);

  const canUpdate = hasPermission('partners:update');
  const canDelete = hasPermission('partners:delete');

  return (
    <div>
      <Link
        href="/dashboard/partners"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('partners.archives.back_to_active')}
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('partners.archives.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('partners.archives.desc')}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-[#00875A]" />
        </div>
      ) : !partners?.length ? (
        <EmptyState message={t('partners.archives.no_archived')} />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('partners.archives.th_partner')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('partners.archives.th_channels')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('partners.archives.th_archived_at')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('partners.archives.th_archived_by')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{partner.companyName}</p>
                    <p className="text-xs text-slate-400">{partner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {partner.salesChannels?.length ?? 0}
                    {(partner.salesChannels?.length ?? 0) > 0 && (
                      <span className="ml-2">
                        <Badge tone="slate">{t('partners.archives.channels_disabled')}</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {partner.archivedAt ? formatDateTime(partner.archivedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{partner.archivedBy?.fullName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button variant="secondary" onClick={() => setToRestore(partner)}>
                          <ArchiveRestore className="h-4 w-4" />
                          {t('partners.archives.restore')}
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="danger" onClick={() => setToDelete(partner)}>
                          <Trash2 className="h-4 w-4" />
                          {t('partners.archives.permanent_delete')}
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
        title={t('partners.archives.confirm_restore_title')}
        description={`"${toRestore?.companyName}" ${t('partners.archives.confirm_restore_desc')}`}
        confirmLabel={t('partners.archives.restore')}
        isLoading={restorePartner.isPending}
        onClose={() => setToRestore(null)}
        onConfirm={() => {
          if (!toRestore) return;
          restorePartner.mutate(toRestore.id, { onSuccess: () => setToRestore(null) });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t('partners.archives.confirm_delete_title')}
        description={`${t('partners.archives.confirm_delete_desc_prefix')} "${toDelete?.companyName}" ${t('partners.archives.confirm_delete_desc_suffix')}`}
        confirmLabel={t('ticketCategories.confirm_delete_button')}
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

