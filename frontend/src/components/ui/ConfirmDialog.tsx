'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import { useI18nStore } from '@/store/i18n-store';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isLoading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const t = useI18nStore((s) => s.t);
  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-sm">
      <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('ui.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel ?? t('ui.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
