'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { FullScreenSpinner } from '@/components/ui/Spinner';

export default function RootPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hydrated, accessToken, router]);

  return <FullScreenSpinner />;
}
