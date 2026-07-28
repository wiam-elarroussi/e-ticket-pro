import { Event } from './event-types';

export type SubscriptionFormulaType = 'SAISON' | 'ELIMINATOIRES' | 'POULES';
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface SubscriptionFormulaEvent {
  formulaId: string;
  eventId: string;
  event?: Event;
}

export interface SubscriptionFormula {
  id: string;
  name: string;
  type: SubscriptionFormulaType;
  venueId: string;
  price: string;
  validFrom: string;
  validTo: string;
  globalAccess: boolean;
  createdAt: string;
  updatedAt: string;
  includedEvents?: SubscriptionFormulaEvent[];
  _count?: { subscriptions: number };
}

export interface Subscription {
  id: string;
  formulaId: string;
  holderName: string;
  holderEmail: string | null;
  holderPhone: string | null;
  seatId: string | null;
  nfcTagId: string | null;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  formula?: SubscriptionFormula;
}

export interface AccessCheckResult {
  granted: boolean;
  reason: string | null;
  seatId?: string | null;
}
