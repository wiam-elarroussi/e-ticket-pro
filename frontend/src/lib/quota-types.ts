import { TicketCategory } from './pricing-types';

export type QuotaScope = 'EVENT' | 'STAND' | 'ZONE' | 'CHANNEL';

export interface SalesQuota {
  id: string;
  eventId: string;
  scope: QuotaScope;
  standId: string | null;
  zoneId: string | null;
  channelId: string | null;
  categoryId: string | null;
  maxQuantity: number | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  category?: TicketCategory | null;
}
