export type EventType = 'MATCH' | 'COMPETITION' | 'SHOW';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface Event {
  id: string;
  name: string;
  type: EventType;
  homeTeam: string | null;
  awayTeam: string | null;
  venueId: string;
  status: EventStatus;
  startAt: string;
  endAt: string;
  salesOpenAt: string | null;
  salesCloseAt: string | null;
  maxPerOrder: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
