'use client';

import { CheckCircle2 } from 'lucide-react';
import { useOrder } from '@/hooks/useOrders';
import { useCodeImage, useTicket } from '@/hooks/useTickets';
import { useTicketTemplate } from '@/hooks/useTicketTemplates';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TicketPreview } from '@/components/templates/TicketPreview';
import { formatMad } from '@/lib/format';

interface SaleConfirmationProps {
  orderId: string;
  onNewSale: () => void;
}

export function SaleConfirmation({ orderId, onNewSale }: SaleConfirmationProps) {
  const { data: order, isLoading } = useOrder(orderId);
  const { t } = useI18nStore();

  if (isLoading || !order) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-[#00875A]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-8 w-8 text-[#00875A]" />
        <div>
          <p className="font-bold text-emerald-800">{t('pos.sale.completed')}</p>
          <p className="text-sm text-emerald-700">
            {order.items.length} {t('pos.sale.ticket_count')} — {formatMad(order.totalAmount)}
          </p>
        </div>
        <Button className="ml-auto bg-[#00875A] text-white hover:bg-[#00754e]" onClick={onNewSale}>
          {t('pos.sale.new_sale')}
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
      <div className="flex h-40 items-center justify-center rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <Spinner className="h-5 w-5 text-[#00875A]" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="overflow-auto">
        <TicketPreview template={template} dataSnapshot={ticket.dataSnapshot} qrDataUrl={qr?.dataUrl} />
      </div>
      <p className="mt-2 font-mono text-xs text-slate-400">{ticket.code}</p>
    </div>
  );
}

