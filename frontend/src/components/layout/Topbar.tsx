'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth-store';
import { logout as logoutRequest } from '@/api/auth';
import { Button } from '@/components/ui/Button';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const clear = useAuthStore((s) => s.clear);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // La session est de toute façon nettoyée localement même si l'appel échoue.
    } finally {
      clear();
      // Sans ça, le cache React Query (profil, listes...) du compte précédent
      // survit à la déconnexion et s'affiche brièvement — voire jusqu'à
      // expiration du staleTime — après la connexion d'un autre utilisateur.
      queryClient.clear();
      toast.success('Déconnecté');
      router.replace('/login');
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 sm:gap-4">
        {me && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{me.fullName}</p>
            <p className="text-xs text-slate-500">{me.role.label}</p>
          </div>
        )}
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
