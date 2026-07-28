'use client';

import { CheckCircle2 } from 'lucide-react';
import { useOrder } from '@/hooks/useOrders';
import { useCodeImage, useTicket } from '@/hooks/useTickets';
import { useTicketTemplate } from '@/hooks/useTicketTemplates';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TicketPreview } from '@/components/templates/TicketPreview';

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

interface SaleConfirmationProps {
  orderId: string;
  onNewSale: () => void;
}

export function SaleConfirmation({ orderId, onNewSale }: SaleConfirmationProps) {
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading || !order) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 p-4 ring-1 ring-inset ring-green-200">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
        <div>
          <p className="font-semibold text-green-900">Vente enregistrée</p>
          <p className="text-sm text-green-700">
            {order.items.length} billet(s) — {priceFormatter.format(Number(order.totalAmount))}
          </p>
        </div>
        <Button className="ml-auto" onClick={onNewSale}>
          Nouvelle vente
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {order.items.map((item) =>
          item.ticketId ? <GeneratedTicketCard key={item.id} ticketId={item.ticketId} /> : null,
        )}
      </div>
    </div>
  );
}

function GeneratedTicketCard({ ticketId }: { ticketId: string }) {
  const { data: ticket } = useTicket(ticketId);
  const { data: template } = useTicketTemplate(ticket?.templateId ?? '');
  const { data: qr } = useCodeImage(ticketId, 'qrcode');

  if (!ticket || !template) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <Spinner className="h-5 w-5 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="overflow-auto">
        <TicketPreview template={template} dataSnapshot={ticket.dataSnapshot} qrDataUrl={qr?.dataUrl} />
      </div>
      <p className="mt-2 font-mono text-xs text-slate-400">{ticket.code}</p>
    </div>
  );
}
