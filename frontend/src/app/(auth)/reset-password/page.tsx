'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { confirmPasswordReset } from '@/api/auth';
import { ApiError } from '@/lib/api-client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useI18nStore, TranslationKey } from '@/store/i18n-store';

const PASSWORD_RULE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;

const buildSchema = (t: (key: TranslationKey) => string) =>
  z
    .object({
      newPassword: z
        .string()
        .min(12, t('auth.password_min_12'))
        .max(128)
        .regex(PASSWORD_RULE, t('auth.password_complexity')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.passwords_mismatch'),
      path: ['confirmPassword'],
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useI18nStore((s) => s.t);
  const schema = useMemo(() => buildSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error(t('toast.auth.reset_link_invalid'));
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token, values.newPassword);
      toast.success(t('toast.auth.password_reset_success'));
      router.replace('/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('toast.auth.reset_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-600 dark:text-slate-300">
        <p>{t('auth.invalid_reset_link')}</p>
        <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
          {t('auth.request_new_link')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        type="password"
        label={t('auth.new_password')}
        autoFocus
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        type="password"
        label={t('auth.confirm_password')}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {t('auth.reset_password_button')}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
