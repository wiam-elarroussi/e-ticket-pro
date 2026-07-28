'use client';

import { Suspense, useState } from 'react';
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

const PASSWORD_RULE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Minimum 12 caractères')
      .max(128)
      .regex(PASSWORD_RULE, 'Doit contenir majuscule, minuscule, chiffre et caractère spécial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error('Lien de réinitialisation invalide (token manquant)');
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token, values.newPassword);
      toast.success('Mot de passe réinitialisé, vous pouvez vous reconnecter');
      router.replace('/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Réinitialisation impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-600">
        <p>Ce lien de réinitialisation est invalide ou incomplet.</p>
        <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
          Redemander un lien
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        type="password"
        label="Nouveau mot de passe"
        autoFocus
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        type="password"
        label="Confirmer le mot de passe"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        Réinitialiser le mot de passe
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
