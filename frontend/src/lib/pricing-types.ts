export interface TicketCategory {
  id: string;
  code: string;
  name: string;
  isFree: boolean;
  requiresNominativeInfo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PriceScope = 'EVENT' | 'STAND' | 'ZONE' | 'SEAT';

export interface PriceRule {
  id: string;
  eventId: string;
  categoryId: string;
  scope: PriceScope;
  standId: string | null;
  zoneId: string | null;
  seatId: string | null;
  price: string;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
  category?: TicketCategory;
}
