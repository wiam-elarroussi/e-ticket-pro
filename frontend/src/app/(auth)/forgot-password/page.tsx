'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '@/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useI18nStore } from '@/store/i18n-store';

type FormValues = { email: string };

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => z.object({ email: z.string().email(t('auth.email_invalid')) }), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Le backend ne révèle jamais si l'email existe : on affiche toujours le même message.
      await requestPasswordReset(values.email);
    } finally {
      setIsSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('auth.reset_sent_message')}
        </p>
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          {t('auth.back_to_login')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('auth.forgot_password_hint')}
      </p>
      <Input
        type="email"
        label={t('ui.email')}
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {t('auth.send_link')}
      </Button>
      <Link href="/login" className="text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
        {t('auth.back_to_login')}
      </Link>
    </form>
  );
}
