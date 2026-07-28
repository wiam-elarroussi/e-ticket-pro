export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'OUT_OF_SERVICE';
export type NumberingDirection = 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';

export interface MapPoint {
  x: number;
  y: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  gates?: Gate[];
  stands?: Stand[];
  _count?: { stands: number; gates: number };
}

export interface Gate {
  id: string;
  venueId: string;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
}

export interface Stand {
  id: string;
  venueId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  zones?: Zone[];
  _count?: { zones: number };
}

export interface GateZoneAccess {
  gateId: string;
  zoneId: string;
  gate?: Gate;
}

export interface Zone {
  id: string;
  standId: string;
  name: string;
  colorHex: string | null;
  mapPolygon: MapPoint[] | null;
  createdAt: string;
  rows?: Row[];
  gateAccess?: GateZoneAccess[];
  _count?: { rows: number };
}

export interface Row {
  id: string;
  zoneId: string;
  label: string;
  orderIndex: number;
  numberingDirection: NumberingDirection;
  createdAt: string;
  seats?: Seat[];
  _count?: { seats: number };
}

export interface Seat {
  id: string;
  rowId: string;
  number: number;
  label: string | null;
  x: number | null;
  y: number | null;
  status: SeatStatus;
  createdAt: string;
}

/** Arborescence complète renvoyée par GET /venues/:id/full — alimente l'éditeur de plan. */
export interface VenueFullTree extends Venue {
  gates: (Gate & { zoneAccess: GateZoneAccess[] })[];
  stands: (Stand & { zones: (Zone & { rows: (Row & { seats: Seat[] })[] })[] })[];
}
