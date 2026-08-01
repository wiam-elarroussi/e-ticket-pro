export type OrderStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'VOUCHER' | 'ONLINE' | 'APPLE_PAY' | 'GOOGLE_PAY';

export interface OrderItem {
  id: string;
  orderId: string;
  eventId: string;
  seatId: string;
  standId: string;
  zoneId: string;
  categoryId: string;
  ticketId: string | null;
  unitPrice: string;
  createdAt: string;
}

export interface Order {
  id: string;
  eventId: string;
  venueId: string;
  channelId: string;
  operatorId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
