'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Banknote, CreditCard, Delete, Ticket as TicketIcon, Trash2, DollarSign, ShoppingBag, Printer, ShieldCheck, SmartphoneNfc, WifiOff, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useVenueFullTree } from '@/hooks/useVenues';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useResolvePrice, usePriceRules } from '@/hooks/usePriceRules';
import { useCheckout, useOrders } from '@/hooks/useOrders';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SaleConfirmation } from '@/components/pos/SaleConfirmation';
import { PaymentMethod } from '@/lib/order-types';
import { ApiError } from '@/lib/api-client';
import { formatMad } from '@/lib/format';
import { TranslationKey } from '@/store/i18n-store';
import {
  saveCatalogSnapshot,
  loadCatalogSnapshot,
  resolveOfflinePrice,
  getOfflineQueue,
  pushOfflineQueue,
  removeFromQueue,
  getLocallySoldSeats,
  markSeatsSoldLocally,
  OfflineSale,
} from '@/lib/offline-pos';

const SeatCanvas = dynamic(() => import('@/components/venues/map/SeatCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <Spinner className="h-6 w-6 text-[#00875A]" />
    </div>
  ),
});

const ZonePolygonEditor = dynamic(() => import('@/components/venues/map/ZonePolygonEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center">
      <Spinner className="h-6 w-6 text-[#00875A]" />
    </div>
  ),
});

const paymentOptions: Array<{ value: PaymentMethod; labelKey: TranslationKey; icon: typeof Banknote }> = [
  { value: 'CASH', labelKey: 'pos.payment_cash', icon: Banknote },
  { value: 'CARD', labelKey: 'pos.payment_card', icon: CreditCard },
  { value: 'VOUCHER', labelKey: 'pos.payment_voucher', icon: TicketIcon },
  { value: 'APPLE_PAY', labelKey: 'pos.payment_apple_pay', icon: SmartphoneNfc },
  { value: 'GOOGLE_PAY', labelKey: 'pos.payment_google_pay', icon: SmartphoneNfc },
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
  const { data: pastOrders } = useOrders();
  const checkout = useCheckout();
  const { t } = useI18nStore();


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
  const [cashReceived, setCashReceived] = useState('');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [offlineConfirmation, setOfflineConfirmation] = useState<{ ticketCount: number; total: number } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState<OfflineSale[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  const event = events?.find((e) => e.id === eventId);
  const { data: venue } = useVenueFullTree(event?.venueId ?? '');
  const { data: priceRules } = usePriceRules(eventId || undefined);
  const stands = venue?.stands ?? [];

  // Mode hybride local/cloud (module 5, "Continuité de Service") : le catalogue de
  // l'événement sélectionné est mis en cache localement dès qu'il est chargé, pour
  // rester exploitable si le réseau tombe pendant le service au guichet.
  useEffect(() => {
    if (eventId && venue && categories && priceRules) {
      saveCatalogSnapshot({ eventId, venue, categories, priceRules });
    }
  }, [eventId, venue, categories, priceRules]);

  const flushOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setIsSyncing(true);
    let synced = 0;
    for (const sale of queue) {
      try {
        await checkout.mutateAsync(sale.payload);
        removeFromQueue(sale.localId);
        synced += 1;
      } catch {
        break;
      }
    }
    setPendingSync(getOfflineQueue());
    setIsSyncing(false);
    if (synced > 0) {
      toast.success(`${synced} vente(s) hors-ligne synchronisée(s) avec le serveur`);
      setIsOffline(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => flushOfflineQueue();
    window.addEventListener('online', handleOnline);
    if (getOfflineQueue().length > 0) flushOfflineQueue();
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // Sièges vendus hors-ligne à ce poste (pas encore confirmés par le serveur) affichés
  // comme indisponibles, pour ne pas les proposer une seconde fois dans la même session.
  const locallySoldSeatIds = useMemo(() => (eventId ? new Set(getLocallySoldSeats(eventId)) : new Set<string>()), [eventId, offlineConfirmation]);
  const rows = useMemo(
    () =>
      (zone?.rows ?? []).map((row) => ({
        ...row,
        seats: (row.seats ?? []).map((seat) =>
          locallySoldSeatIds.has(seat.id) && seat.status === 'AVAILABLE' ? { ...seat, status: 'SOLD' as const } : seat,
        ),
      })),
    [zone, locallySoldSeatIds],
  );
  const allSeats = rows.flatMap((r) => r.seats ?? []);

  const flatZones = stands.flatMap((s) => s.zones.map((z) => ({ ...z, standId: s.id, standName: s.name })));
  const handleZoneClick = (clickedZoneId: string) => {
    const parentStand = stands.find((s) => s.zones.some((z) => z.id === clickedZoneId));
    if (parentStand) setZoneKey(`${parentStand.id}:${clickedZoneId}`);
  };

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const activeChannels = (channels ?? []).filter((c) => c.isActive);

  // Statistiques de la session guichet
  const sessionKpis = useMemo(() => {
    const totalRevenue = (pastOrders ?? []).reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalTicketsSold = (pastOrders ?? []).reduce((sum, o) => sum + o.items.length, 0);
    return { totalRevenue, totalTicketsSold };
  }, [pastOrders]);

  const buyerSuggestions = useMemo(
    () => Array.from(new Set((pastOrders ?? []).map((o) => o.buyerName).filter((n): n is string => !!n))).sort(),
    [pastOrders],
  );

  const resolveQuery = eventId && categoryId && standId && zoneId ? { eventId, categoryId, standId, zoneId } : null;
  const { data: priceResolved } = useResolvePrice(resolveQuery);
  // Repli sur le catalogue mis en cache si l'appel serveur échoue (hors-ligne) — le prix
  // affiché reste réel (grille tarifaire déjà chargée), pas une valeur inventée.
  const offlinePriceRule =
    priceRules && categoryId && (standId || zoneId) ? resolveOfflinePrice(priceRules, { categoryId, standId, zoneId }) : null;
  const unitPrice = priceResolved ? Number(priceResolved.price) : offlinePriceRule ? Number(offlinePriceRule.price) : null;
  const total = unitPrice != null ? unitPrice * cartSeatIds.size : 0;
  const received = Number(cashReceived) || 0;
  const change = received - total;

  const handleSelectionChange = (ids: Set<string>) => {
    const filtered = new Set(
      Array.from(ids).filter((id) => allSeats.find((s) => s.id === id)?.status === 'AVAILABLE'),
    );
    setCartSeatIds(filtered);
  };

  const requiresBuyer = selectedCategory?.requiresNominativeInfo ?? false;
  const cashOk = paymentMethod !== 'CASH' || total === 0 || received >= total;
  const canSubmit =
    !!eventId &&
    !!zoneKey &&
    !!categoryId &&
    !!templateId &&
    !!channelId &&
    cartSeatIds.size > 0 &&
    cashOk &&
    (!requiresBuyer || buyerName.trim().length > 0);

  const onCheckout = async () => {
    if (!event) return;
    const payload = {
      eventId,
      venueId: event.venueId,
      channelId,
      templateId,
      paymentMethod,
      buyerName: buyerName || undefined,
      buyerEmail: buyerEmail || undefined,
      buyerPhone: buyerPhone || undefined,
      items: Array.from(cartSeatIds).map((seatId) => ({ seatId, standId, zoneId, categoryId })),
    };
    const seatCount = cartSeatIds.size;
    const saleTotal = total;

    const resetForm = () => {
      setCartSeatIds(new Set());
      setBuyerName('');
      setBuyerEmail('');
      setBuyerPhone('');
      setCashReceived('');
    };

    try {
      const order = await checkout.mutateAsync(payload);
      setCompletedOrderId(order.id);
      resetForm();
      if (isOffline) {
        setIsOffline(false);
        flushOfflineQueue();
      }
    } catch (err) {
      // Erreur réseau (backend injoignable) vs erreur applicative (ApiError, ex: siège
      // déjà vendu, quota atteint) : seule la première bascule en mode hybride local.
      if (err instanceof ApiError) return;
      if (!eventId) return;
      setIsOffline(true);
      const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pushOfflineQueue({ localId, payload, soldLocallyAt: new Date().toISOString() });
      markSeatsSoldLocally(eventId, Array.from(cartSeatIds));
      setPendingSync(getOfflineQueue());
      setOfflineConfirmation({ ticketCount: seatCount, total: saleTotal });
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête du module POS */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('pos.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('pos.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('pos.desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
              <WifiOff className="h-4 w-4" />
              {t('pos.offline_mode')}
            </span>
          ) : (
            <Badge tone="green">{t('access.realtime')}</Badge>
          )}
          {pendingSync.length > 0 && (
            <Button variant="secondary" className="!py-1.5 !px-3.5 !text-xs font-bold" onClick={flushOfflineQueue} isLoading={isSyncing}>
              <UploadCloud className="h-3.5 w-3.5" />
              {pendingSync.length} {t('pos.pending_sync_suffix')}
            </Button>
          )}
        </div>
      </div>

      {/* Cartes KPI Synthétiques Session Guichet */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('pos.kpi_revenue')}</span>
            <DollarSign className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{formatMad(sessionKpis.totalRevenue)}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('pos.kpi_revenue_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('pos.kpi_tickets')}</span>
            <ShoppingBag className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{sessionKpis.totalTicketsSold}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('pos.kpi_tickets_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('pos.kpi_cash')}</span>
            <Banknote className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-700">{t('pos.change_auto')}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('pos.instant_calculator')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('pos.kpi_card')}</span>
            <CreditCard className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

      {completedOrderId ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <SaleConfirmation orderId={completedOrderId} onNewSale={() => setCompletedOrderId(null)} />
        </div>
      ) : offlineConfirmation ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <WifiOff className="h-8 w-8 text-amber-600" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-300">{t('pos.offline_sale_recorded')}</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {offlineConfirmation.ticketCount} {t('pos.sale.ticket_count')} — {formatMad(offlineConfirmation.total)}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{t('pos.offline_ticket_pending')}</p>
            </div>
            <Button className="ml-auto bg-amber-600 text-white hover:bg-amber-700" onClick={() => setOfflineConfirmation(null)}>
              {t('pos.sale.new_sale')}
            </Button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Étape 1 : Paramètres du Billet */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#00875A]">{t('pos.step1_title')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label={t('access.event_label')} value={eventId} onChange={(e) => setEventId(e.target.value)} className="text-xs">
                <option value="">{t('pos.choose_match')}</option>
                {publishedEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
              <Select label={t('pricing.form.category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="text-xs">
                <option value="">{t('pos.choose_category')}</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label={t('pos.template_label')} value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="text-xs">
                <option value="">{t('pos.choose_template')}</option>
                {(templates ?? []).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </Select>
              <Select label={t('quotas.form.channel')} value={channelId} onChange={(e) => setChannelId(e.target.value)} className="text-xs">
                <option value="">{t('pos.choose_channel')}</option>
                {activeChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Étape 2 : Plan 2D des Zones */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#00875A]">{t('pos.step2_title')}</h2>
              {zone && <span className="text-xs font-extrabold text-[#00875A]">{t('pos.selection_label')} {stand?.name} · {zone.name}</span>}
            </div>
            {!event ? (
              <EmptyState message={t('pos.choose_event_first')} />
            ) : !flatZones.length ? (
              <EmptyState message={t('pos.no_zones_mapped')} />
            ) : (
              <div className="overflow-auto rounded-xl bg-slate-950 border border-slate-800">
                <ZonePolygonEditor zones={flatZones} selectedZoneId={zoneId || null} onZoneClick={handleZoneClick} />
              </div>
            )}
          </div>

          {/* Étape 3 : Grille Tactile des Sièges */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#00875A]">{t('pos.step3_title')}</h2>
            {!zone ? (
              <EmptyState message={t('pos.touch_zone_hint')} />
            ) : !allSeats.length ? (
              <EmptyState message={t('pos.no_seats_in_zone')} />
            ) : (
              <div className="overflow-auto rounded-xl bg-slate-950 border border-slate-800">
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

        {/* Panier & Encaissement Guichet */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs h-fit space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">{t('pos.step4_title')}</h2>

          {cartSeatIds.size === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{t('pos.no_seat_selected')}</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              <AnimatePresence>
                {Array.from(cartSeatIds).map((seatId) => {
                  const seat = allSeats.find((s) => s.id === seatId);
                  return (
                    <motion.li
                      key={seatId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800/80"
                    >
                      <span className="text-slate-800 dark:text-slate-100 font-bold">{seat?.label ?? `${t('subscriptions.form.seat_label')} ${seat?.number}`}</span>
                      <div className="flex items-center gap-2">
                        {unitPrice != null && <span className="text-[#00875A] font-extrabold">{formatMad(unitPrice)}</span>}
                        <button
                          onClick={() => setCartSeatIds((prev) => new Set(Array.from(prev).filter((id) => id !== seatId)))}
                          className="text-slate-400 transition-colors hover:text-red-600"
                          aria-label={t('pos.remove_from_cart')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-b border-slate-100 dark:border-slate-800 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('pos.total_general')}</span>
            <span className="text-2xl font-extrabold text-[#00875A]">{formatMad(total)}</span>
          </div>

          <div className="space-y-3">
            <Input
              label={t('pos.buyer_name')}
              list="pos-buyer-suggestions"
              placeholder={t('pos.buyer_name_placeholder')}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className={requiresBuyer && !buyerName ? 'ring-2 ring-red-400' : undefined}
            />
            <datalist id="pos-buyer-suggestions">
              {buyerSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {requiresBuyer && (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Badge tone="amber">{t('pos.nominative_required')}</Badge>
                  <span>{t('pos.id_required')}</span>
                </div>
                <Input placeholder={t('pos.buyer_email_placeholder')} value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                <Input placeholder={t('pos.buyer_phone_placeholder')} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-bold transition-all duration-200 ${
                  paymentMethod === opt.value
                    ? 'border-[#00875A] bg-emerald-50 text-[#00875A] shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <opt.icon className="h-5 w-5" />
                <span>{t(opt.labelKey)}</span>
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' && total > 0 && (
            <CashKeypad received={cashReceived} onChange={setCashReceived} total={total} change={change} />
          )}

          <Button
            className="w-full bg-[#00875A] text-white hover:bg-[#00754e] py-3 text-sm font-bold shadow-xs"
            disabled={!canSubmit}
            isLoading={checkout.isPending}
            onClick={onCheckout}
          >
            {t('pos.confirm_checkout')} {formatMad(total)}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

/** Pavé numérique d'encaissement tactile — monnaie à rendre en vert émeraude vif. */
function CashKeypad({
  received,
  onChange,
  total,
  change,
}: {
  received: string;
  onChange: (value: string) => void;
  total: number;
  change: number;
}) {
  const t = useI18nStore((s) => s.t);
  const press = (digit: string) => {
    if (digit === 'C') return onChange('');
    if (digit === '⌫') return onChange(received.slice(0, -1));
    if (digit === '.' && received.includes('.')) return;
    onChange(received + digit);
  };

  const quickAmounts = [total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter(
    (v, i, arr) => v > 0 && arr.indexOf(v) === i,
  );

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3.5 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{t('pos.cash_received')}</span>
        <div className="flex gap-1">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => onChange(String(amt))}
              className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {formatMad(amt)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-right text-xl font-extrabold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
        {received || '0'} <span className="text-xs text-slate-400 font-normal">MAD</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="rounded-lg bg-white dark:bg-slate-900 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-emerald-50"
          >
            {k === '⌫' ? <Delete className="mx-auto h-4 w-4" /> : k}
          </button>
        ))}
      </div>

      <button
        onClick={() => press('C')}
        className="w-full rounded-lg py-1 text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
      >
        {t('pos.clear_entry')}
      </button>

      {received && (
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${
            change >= 0 ? 'bg-emerald-50 text-[#00875A] border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span>{change >= 0 ? t('pos.change_due') : t('pos.insufficient_amount')}</span>
          <span className="text-base font-extrabold">{formatMad(Math.abs(change))}</span>
        </div>
      )}
    </div>
  );
}

