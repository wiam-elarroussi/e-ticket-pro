'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

interface RequirePermissionProps {
  /** Permission requise pour voir la page. */
  permission: string;
  children: React.ReactNode;
}

/**
 * Garde-fou côté page (RBAC UI Guard) : bloque le rendu et redirige vers
 * /dashboard si l'utilisateur connecté n'a pas la permission requise —
 * empêche l'accès direct par URL à une page dont le lien est masqué dans le
 * Sidebar. Doit être utilisé à l'intérieur de dashboard/layout.tsx (donc déjà
 * protégé par RequireAuth), pas de vérification d'hydratation ici.
 */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const allowed = hasPermission(permission);

  useEffect(() => {
    if (!allowed) {
      toast.error("Vous n'avez pas les droits nécessaires pour accéder à cette page");
      router.replace('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) return null;

  return <>{children}</>;
}
