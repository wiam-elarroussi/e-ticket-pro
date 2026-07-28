export type TemplateElementType = 'text' | 'image' | 'qrcode' | 'barcode';

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  binding?: string;
  staticText?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  imageUrl?: string;
}

export interface TicketTemplate {
  id: string;
  name: string;
  description: string | null;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  elements: TemplateElement[];
  createdAt: string;
  updatedAt: string;
  _count?: { generatedTickets: number };
}
