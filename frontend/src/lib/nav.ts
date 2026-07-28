import { LayoutDashboard, Users, ShieldCheck, MonitorSmartphone, Handshake, Landmark, CalendarDays, Tags, Ticket, LayoutTemplate, ShoppingCart, Receipt, ScanLine } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Si défini, l'item n'est affiché que si l'utilisateur possède cette permission. */
  requiredPermission?: string;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Utilisateurs', icon: Users, requiredPermission: 'users:read' },
  { href: '/dashboard/roles', label: 'Rôles & permissions', icon: ShieldCheck, requiredPermission: 'roles:manage' },
  { href: '/dashboard/sessions', label: 'Sessions', icon: MonitorSmartphone },
  { href: '/dashboard/partners', label: 'Partenaires', icon: Handshake, requiredPermission: 'partners:read' },
  { href: '/dashboard/venues', label: 'Enceintes', icon: Landmark, requiredPermission: 'venues:read' },
  { href: '/dashboard/events', label: 'Événements', icon: CalendarDays, requiredPermission: 'events:read' },
  { href: '/dashboard/ticket-categories', label: 'Catégories de billets', icon: Tags, requiredPermission: 'pricing:read' },
  { href: '/dashboard/subscription-formulas', label: 'Abonnements', icon: Ticket, requiredPermission: 'subscriptions:read' },
  { href: '/dashboard/ticket-templates', label: 'Gabarits de billets', icon: LayoutTemplate, requiredPermission: 'templates:read' },
  { href: '/dashboard/pos', label: 'Vente rapide', icon: ShoppingCart, requiredPermission: 'pos:sell' },
  { href: '/dashboard/orders', label: 'Historique des ventes', icon: Receipt, requiredPermission: 'orders:read' },
  { href: '/dashboard/access', label: 'Contrôle d’accès', icon: ScanLine, requiredPermission: 'access:scan' },
];
