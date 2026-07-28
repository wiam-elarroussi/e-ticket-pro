'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { login } from '@/api/auth';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  username: z.string().min(3, 'Minimum 3 caractères').max(50),
  password: z.string().min(8, 'Minimum 8 caractères').max(128),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await login(values.username, values.password);
      setTokens(result.accessToken, result.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Connexion impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Identifiant"
        autoComplete="username"
        autoFocus
        error={errors.username?.message}
        {...register('username')}
      />
      <Input
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        Se connecter
      </Button>
      <Link href="/forgot-password" className="text-center text-sm text-indigo-600 hover:text-indigo-500">
        Mot de passe oublié ?
      </Link>
    </form>
  );
}
