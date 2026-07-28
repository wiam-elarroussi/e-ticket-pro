'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}
