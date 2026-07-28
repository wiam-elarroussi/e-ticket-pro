export type GeneratedTicketStatus = 'ACTIVE' | 'CANCELLED';

export interface GeneratedTicket {
  id: string;
  templateId: string;
  eventId: string | null;
  code: string;
  checksum: string;
  status: GeneratedTicketStatus;
  nfcTagId: string | null;
  dataSnapshot: Record<string, unknown>;
  reprintCount: number;
  lastReprintedAt: string | null;
  lastReprintedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyCodeResult {
  checksumValid: boolean;
  exists: boolean;
  ticket: GeneratedTicket | null;
}
