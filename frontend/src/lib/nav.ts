import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  MonitorSmartphone,
  Handshake,
  Landmark,
  CalendarDays,
  Tags,
  Ticket,
  LayoutTemplate,
  ShoppingCart,
  Receipt,
  ScanLine,
  Radio,
  BarChart3,
} from 'lucide-react';
import { TranslationKey } from '@/store/i18n-store';

export interface NavItem {
  href: string;
  translationKey: TranslationKey;
  icon: typeof LayoutDashboard;
  requiredPermission?: string;
  category?: string;
}

export interface NavCategory {
  id: string;
  titleKey: TranslationKey;
  items: NavItem[];
}

export const navCategories: NavCategory[] = [
  {
    id: 'supervision',
    titleKey: 'nav.supervision',
    items: [
      { href: '/dashboard', translationKey: 'nav.dashboard', icon: LayoutDashboard },
      { href: '/dashboard/reports', translationKey: 'nav.reports', icon: BarChart3, requiredPermission: 'reports:read' },
    ],
  },
  {
    id: 'venue',
    titleKey: 'nav.venue_ops',
    items: [
      { href: '/dashboard/venues', translationKey: 'nav.venues', icon: Landmark, requiredPermission: 'venues:read' },
      { href: '/dashboard/events', translationKey: 'nav.events', icon: CalendarDays, requiredPermission: 'events:read' },
      { href: '/dashboard/ticket-categories', translationKey: 'nav.ticket_categories', icon: Tags, requiredPermission: 'pricing:read' },
      { href: '/dashboard/subscription-formulas', translationKey: 'nav.subscriptions', icon: Ticket, requiredPermission: 'subscriptions:read' },
      { href: '/dashboard/ticket-templates', translationKey: 'nav.ticket_templates', icon: LayoutTemplate, requiredPermission: 'templates:read' },
    ],
  },
  {
    id: 'pos',
    titleKey: 'nav.sales',
    items: [
      { href: '/dashboard/pos', translationKey: 'nav.pos', icon: ShoppingCart, requiredPermission: 'pos:sell' },
      { href: '/dashboard/orders', translationKey: 'nav.orders', icon: Receipt, requiredPermission: 'orders:read' },
      { href: '/dashboard/partners', translationKey: 'nav.partners', icon: Handshake, requiredPermission: 'partners:read' },
      { href: '/dashboard/sales-channels', translationKey: 'nav.sales_channels', icon: Radio, requiredPermission: 'channels:read' },
    ],
  },
  {
    id: 'security',
    titleKey: 'nav.security',
    items: [
      { href: '/dashboard/access', translationKey: 'nav.access', icon: ScanLine, requiredPermission: 'access:scan' },
      { href: '/dashboard/users', translationKey: 'nav.users', icon: Users, requiredPermission: 'users:read' },
      { href: '/dashboard/roles', translationKey: 'nav.roles', icon: ShieldCheck, requiredPermission: 'roles:manage' },
      { href: '/dashboard/sessions', translationKey: 'nav.sessions', icon: MonitorSmartphone },
    ],
  },
];

export const navItems: NavItem[] = navCategories.flatMap((cat) => cat.items);
