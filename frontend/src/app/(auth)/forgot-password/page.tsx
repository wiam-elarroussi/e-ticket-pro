'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '@/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({ email: z.string().email('Email invalide') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <p className="text-sm text-slate-600">
          Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé.
        </p>
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Entrez votre email professionnel, nous vous enverrons un lien de réinitialisation.
      </p>
      <Input
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        Envoyer le lien
      </Button>
      <Link href="/login" className="text-center text-sm text-slate-500 hover:text-slate-700">
        Retour à la connexion
      </Link>
    </form>
  );
}
