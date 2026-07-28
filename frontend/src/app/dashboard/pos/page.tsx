'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Banknote, CreditCard, Ticket as TicketIcon, Trash2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useResolvePrice } from '@/hooks/usePriceRules';
import { useCheckout } from '@/hooks/useOrders';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SaleConfirmation } from '@/components/pos/SaleConfirmation';
import { PaymentMethod } from '@/lib/order-types';

const SeatCanvas = dynamic(() => import('@/components/venues/map/SeatCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg bg-slate-50">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

const ZonePolygonEditor = dynamic(() => import('@/components/venues/map/ZonePolygonEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-lg bg-slate-50">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

const paymentOptions: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: 'CASH', label: 'Espèces', icon: Banknote },
  { value: 'CARD', label: 'Carte bancaire', icon: CreditCard },
  { value: 'VOUCHER', label: 'Bon d’achat', icon: TicketIcon },
];

export default function PosPage() {
  return (
    <RequirePermission permission="pos:sell">
      <PosPageContent />
    </RequirePermission>
  );
}

function PosPageContent() {
  const { data: events } = useEvents();
  const { data: categories } = useTicketCategories();
  const { data: templates } = useTicketTemplates();
  const { data: channels } = useSalesChannels();
  const checkout = useCheckout();

  const publishedEvents = (events ?? []).filter((e) => e.status === 'PUBLISHED');

  const [eventId, setEventId] = useState('');
  const [zoneKey, setZoneKey] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [cartSeatIds, setCartSeatIds] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const event = events?.find((e) => e.id === eventId);
  const { data: venue } = useVenueFullTree(event?.venueId ?? '');
  const stands = venue?.stands ?? [];

  useEffect(() => {
    setZoneKey('');
    setCartSeatIds(new Set());
  }, [eventId]);

  useEffect(() => {
    setCartSeatIds(new Set());
  }, [zoneKey]);

  const [standId, zoneId] = zoneKey.split(':');
  const stand = stands.find((s) => s.id === standId);
  const zone = stand?.zones.find((z) => z.id === zoneId);
  const rows = zone?.rows ?? [];
  const allSeats = rows.flatMap((r) => r.seats ?? []);

  const flatZones = stands.flatMap((s) => s.zones.map((z) => ({ ...z, standId: s.id, standName: s.name })));
  const handleZoneClick = (clickedZoneId: string) => {
    const parentStand = stands.find((s) => s.zones.some((z) => z.id === clickedZoneId));
    if (parentStand) setZoneKey(`${parentStand.id}:${clickedZoneId}`);
  };

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const activeChannels = (channels ?? []).filter((c) => c.isActive);

  const resolveQuery = eventId && categoryId && standId && zoneId ? { eventId, categoryId, standId, zoneId } : null;
  const { data: priceResolved } = useResolvePrice(resolveQuery);
  const unitPrice = priceResolved ? Number(priceResolved.price) : null;
  const total = unitPrice != null ? unitPrice * cartSeatIds.size : 0;

  const handleSelectionChange = (ids: Set<string>) => {
    const filtered = new Set(
      Array.from(ids).filter((id) => allSeats.find((s) => s.id === id)?.status === 'AVAILABLE'),
    );
    setCartSeatIds(filtered);
  };

  const requiresBuyer = selectedCategory?.requiresNominativeInfo ?? false;
  const canSubmit =
    !!eventId &&
    !!zoneKey &&
    !!categoryId &&
    !!templateId &&
    !!channelId &&
    cartSeatIds.size > 0 &&
    (!requiresBuyer || buyerName.trim().length > 0);

  const onCheckout = () => {
    if (!event) return;
    checkout.mutate(
      {
        eventId,
        venueId: event.venueId,
        channelId,
        templateId,
        paymentMethod,
        buyerName: buyerName || undefined,
        buyerEmail: buyerEmail || undefined,
        buyerPhone: buyerPhone || undefined,
        items: Array.from(cartSeatIds).map((seatId) => ({ seatId, standId, zoneId, categoryId })),
      },
      {
        onSuccess: (order) => {
          setCompletedOrderId(order.id);
          setCartSeatIds(new Set());
          setBuyerName('');
          setBuyerEmail('');
          setBuyerPhone('');
        },
      },
    );
  };

  if (completedOrderId) {
    return <SaleConfirmation orderId={completedOrderId} onNewSale={() => setCompletedOrderId(null)} />;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Vente rapide</h1>
      <p className="mb-6 text-sm text-slate-500">Événement → zone/tarif → sièges, puis encaissement.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="1. Événement" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Choisir…</option>
                {publishedEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
              <Select label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choisir…</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label="Gabarit billet" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Choisir…</option>
                {(templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select label="Canal de vente" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                <option value="">Choisir…</option>
                {activeChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="mb-3 text-sm text-slate-500">
              2. Cliquez une tribune/zone sur le plan pour afficher ses sièges.
              {zone && <span className="ml-1 font-medium text-indigo-600">Sélection : {stand?.name} · {zone.name}</span>}
            </p>
            {!event ? (
              <EmptyState message="Choisissez d’abord un événement." />
            ) : !flatZones.length ? (
              <EmptyState message="Aucune zone dessinée pour cette enceinte." />
            ) : (
              <div className="overflow-auto">
                <ZonePolygonEditor zones={flatZones} selectedZoneId={zoneId || null} onZoneClick={handleZoneClick} />
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="mb-3 text-sm text-slate-500">
              3. Touchez les sièges disponibles (verts) pour les ajouter au panier.
            </p>
            {!zone ? (
              <EmptyState message="Choisissez une zone sur le plan ci-dessus." />
            ) : !allSeats.length ? (
              <EmptyState message="Aucun siège dans cette zone." />
            ) : (
              <div className="overflow-auto">
                <SeatCanvas
                  rows={rows}
                  selectedSeatIds={cartSeatIds}
                  onSelectionChange={handleSelectionChange}
                  canDragSeats={false}
                  multiSelectMode
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">4. Panier & encaissement</h2>

          {cartSeatIds.size === 0 ? (
            <p className="text-sm text-slate-400">Aucun siège sélectionné.</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-1.5">
              {Array.from(cartSeatIds).map((seatId) => {
                const seat = allSeats.find((s) => s.id === seatId);
                return (
                  <li key={seatId} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-sm">
                    <span className="text-slate-700">{seat?.label ?? `Siège ${seat?.number}`}</span>
                    <div className="flex items-center gap-2">
                      {unitPrice != null && <span className="text-slate-500">{priceFormatter.format(unitPrice)}</span>}
                      <button
                        onClick={() => setCartSeatIds((prev) => new Set(Array.from(prev).filter((id) => id !== seatId)))}
                        className="text-slate-300 hover:text-red-600"
                        aria-label="Retirer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-semibold text-slate-900">{priceFormatter.format(total)}</span>
          </div>

          {requiresBuyer && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <Badge tone="amber">Billet nominatif</Badge>
                Identification acheteur requise
              </div>
              <Input placeholder="Nom complet" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              <Input placeholder="Email (optionnel)" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
              <Input placeholder="Téléphone (optionnel)" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
            </div>
          )}

          <div className="mb-4 grid grid-cols-3 gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                  paymentMethod === opt.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <opt.icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>

          <Button className="w-full" disabled={!canSubmit} isLoading={checkout.isPending} onClick={onCheckout}>
            Confirmer la vente
          </Button>
        </div>
      </div>
    </div>
  );
}
