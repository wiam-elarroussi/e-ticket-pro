'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUpdateUser } from '@/hooks/useUsers';
import { User } from '@/lib/types';
import { toast } from 'sonner';
import { RefreshCw, Check } from 'lucide-react';
import { useI18nStore } from '@/store/i18n-store';

interface PasswordResetModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function PasswordResetModal({ open, onClose, user }: PasswordResetModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const updateUser = useUpdateUser();
  const t = useI18nStore((s) => s.t);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pwd = 'Pass@';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setError('');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPassword || newPassword.length < 8) {
      setError(t('users.form.password_too_short'));
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: user.id,
        payload: {
          password: newPassword,
        },
      });
      toast.success(`${t('users.form.password_reset_success')} ${user.fullName}`);
      setNewPassword('');
      onClose();
    } catch {
      toast.error(t('users.form.password_reset_error'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t('users.form.reset_password_title')} — ${user?.fullName ?? ''}`}>
      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('users.form.reset_password_hint')} <span className="font-bold text-slate-900 dark:text-white">@{user?.username}</span>.
        </p>

        <div className="relative">
          <Input
            label={t('users.form.new_password')}
            type="text"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError('');
            }}
            error={error}
            placeholder={t('users.form.new_password_placeholder')}
          />
          <button
            type="button"
            onClick={generateRandomPassword}
            className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#00875A] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('users.form.generate_password')}</span>
          </button>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" isLoading={updateUser.isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
            <Check className="h-4 w-4" />
            <span>{t('users.form.save_password')}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
