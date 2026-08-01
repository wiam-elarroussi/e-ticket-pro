import { Language } from '@/store/i18n-store';

const ROLE_LABEL_EN: Record<string, string> = {
  'Super Administrateur': 'Super Administrator',
  Superviseur: 'Supervisor',
  Caissier: 'Cashier',
  Contrôleur: 'Controller',
};

export function translateRoleLabel(label: string | undefined | null, lang: Language): string {
  if (!label) return '';
  if (lang !== 'EN') return label;
  return ROLE_LABEL_EN[label] ?? label;
}
