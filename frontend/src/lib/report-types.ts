export type AccessResult = 'VALID' | 'ALREADY_SCANNED' | 'INVALID' | 'CANCELLED' | 'WRONG_EVENT' | 'OVERRIDDEN';

export interface ChannelRevenue {
  channelId: string;
  channelName: string;
  amount: number;
  orderCount: number;
  ticketCount?: number;
}

export interface EventDashboard {
  event: { id: string; name: string; startAt: string; status: string };
  occupancy: { totalSeats: number; soldSeats: number; occupancyRate: number };
  tickets: { total: number; active: number; cancelled: number };
  revenue: { total: number; orderCount: number; byChannel: ChannelRevenue[] };
  access: { counts: Record<AccessResult, number>; entriesGranted: number; avgLatencyMs: number | null };
}

export interface EventComparisonEntry {
  eventId: string;
  name: string;
  startAt: string;
  ticketsSold: number;
  revenue: number;
  orderCount: number;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'xml' | 'docx';
