'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ScanLine, ShieldAlert, XCircle, Users, ShieldCheck, Activity, Search, RefreshCw, SmartphoneNfc, WifiOff, UploadCloud } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useGates, useGateHeartbeat } from '@/hooks/useGates';
import { useScan, useAccessLogs, useSyncPackage } from '@/hooks/useAccess';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { ApiError } from '@/lib/api-client';
import { ScanResponse, ScanResult } from '@/lib/access-types';
import {
  saveSyncPackage,
  validateOffline,
  pushOfflineQueue,
  getOfflineQueue,
  removeFromQueue,
  OfflineScanEntry,
} from '@/lib/offline-access';
import { TranslationKey } from '@/store/i18n-store';

const CameraScanner = dynamic(() => import('@/components/access/CameraScanner').then((m) => m.CameraScanner), {
  ssr: false,
});

type ScanMode = 'TICKET' | 'NFC' | 'SUBSCRIPTION';

const resultConfig: Record<
  ScanResult,
  { labelKey: TranslationKey; tone: 'green' | 'red' | 'amber'; icon: typeof CheckCircle2; flash: 'green' | 'red' }
> = {
  VALID: { labelKey: 'access.result.valid', tone: 'green', icon: CheckCircle2, flash: 'green' },
  OVERRIDDEN: { labelKey: 'access.result.overridden', tone: 'amber', icon: ShieldAlert, flash: 'green' },
  ALREADY_SCANNED: { labelKey: 'access.result.already_scanned', tone: 'red', icon: XCircle, flash: 'red' },
  INVALID: { labelKey: 'access.result.invalid', tone: 'red', icon: AlertTriangle, flash: 'red' },
  CANCELLED: { labelKey: 'access.result.cancelled', tone: 'red', icon: AlertTriangle, flash: 'red' },
  WRONG_EVENT: { labelKey: 'access.result.wrong_event', tone: 'red', icon: AlertTriangle, flash: 'red' },
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' });

export default function AccessPage() {
  return (
    <RequirePermission permission="access:scan">
      <AccessPageContent />
    </RequirePermission>
  );
}

function AccessPageContent() {
  const { data: events } = useEvents();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const authUser = useAuthStore((s) => s.user);
  const { t } = useI18nStore();
  const canOverride = hasPermission('access:override');
  const scan = useScan();
  const gateHeartbeat = useGateHeartbeat();

  const publishedEvents = (events ?? []).filter((e) => e.status === 'PUBLISHED');

  const [eventId, setEventId] = useState('');
  const [gateId, setGateId] = useState('');
  const [mode, setMode] = useState<ScanMode>('TICKET');
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState<OfflineScanEntry[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  const event = events?.find((e) => e.id === eventId);
  const { data: gates } = useGates(event?.venueId);
  const { data: logs } = useAccessLogs(eventId, gateId || undefined);

  // Mode offline/edge (module 6, lettre de conformité §3) : la liste blanche/noire
  // de l'événement sélectionné est mise en cache localement dès qu'elle est
  // chargée, pour rester exploitable si le réseau tombe pendant l'événement.
  const { data: syncPackage } = useSyncPackage(eventId || undefined);
  useEffect(() => {
    if (syncPackage) saveSyncPackage(syncPackage);
  }, [syncPackage]);

  const flushOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setIsSyncing(true);
    let synced = 0;
    for (const entry of queue) {
      try {
        await scan.mutateAsync({
          eventId: entry.eventId,
          gateId: entry.gateId,
          code: entry.code,
          nfcTagId: entry.nfcTagId,
          subscriptionId: entry.subscriptionId,
        });
        removeFromQueue(entry.localId);
        synced += 1;
      } catch {
        // Toujours hors-ligne (ou erreur serveur) : on arrête, le reste reste en file.
        break;
      }
    }
    setPendingSync(getOfflineQueue());
    setIsSyncing(false);
    if (synced > 0) {
      toast.success(`${synced} scan(s) hors-ligne synchronisé(s) avec le serveur`);
      setIsOffline(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => flushOfflineQueue();
    window.addEventListener('online', handleOnline);
    // File d'attente laissée par une session précédente (page rechargée hors-ligne) :
    // on tente une synchro dès le montage, au cas où le réseau serait déjà revenu.
    if (getOfflineQueue().length > 0) flushOfflineQueue();
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canScan = !!eventId && !!gateId && inputValue.trim().length > 0;

  // Calcul des métriques KPI de la porte
  const kpis = useMemo(() => {
    const list = logs ?? [];
    const validCount = list.filter((l) => l.result === 'VALID' || l.result === 'OVERRIDDEN').length;
    const deniedCount = list.filter((l) => l.result !== 'VALID' && l.result !== 'OVERRIDDEN').length;
    const totalScans = list.length;
    return { validCount, deniedCount, totalScans };
  }, [logs]);

  // Monitoring des obstacles physiques (module 6, lettre de conformité §4) — état
  // réel des portes de l'enceinte, pas un badge "OK" statique.
  const gateStats = useMemo(() => {
    const list = gates ?? [];
    const online = list.filter((g) => g.effectiveStatus === 'ONLINE').length;
    const fault = list.filter((g) => g.effectiveStatus === 'FAULT').length;
    return { total: list.length, online, fault };
  }, [gates]);

  // Filtrage du fil d'actualité des scans
  const filteredLogs = useMemo(() => {
    return (logs ?? []).filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const res = t(resultConfig[l.result]?.labelKey).toLowerCase() ?? '';
      const rsn = (l.reason ?? '').toLowerCase();
      return res.includes(q) || rsn.includes(q) || l.scanType.toLowerCase().includes(q);
    });
  }, [logs, search]);

  const runScan = async (force = false, codeOverride?: string) => {
    const value = (codeOverride ?? inputValue).trim();
    if (!eventId || !gateId || !value) return;

    const payload = {
      eventId,
      gateId,
      code: mode === 'TICKET' ? value : undefined,
      nfcTagId: mode === 'NFC' ? value : undefined,
      subscriptionId: mode === 'SUBSCRIPTION' ? value : undefined,
      force,
    };

    try {
      const res = await scan.mutateAsync(payload);
      setLastResult(res);
      setInputValue('');
      setScanCount((c) => c + 1);
      // Preuve de vie du poste de contrôle (module 6, monitoring des obstacles physiques) :
      // un scan qui aboutit prouve que le matériel de cette porte est bien en ligne.
      gateHeartbeat.mutate({ gateId, status: 'ONLINE' });
      if (isOffline) {
        setIsOffline(false);
        flushOfflineQueue();
      }
    } catch (err) {
      // Erreur réseau (backend injoignable) vs erreur applicative (ApiError, ex: 400) :
      // seule la première bascule en mode offline. Les abonnements n'ont pas de cache
      // local (droits résolus dynamiquement côté events-service) — pas de repli possible.
      if (err instanceof ApiError) {
        return;
      }
      if (mode === 'SUBSCRIPTION') {
        setIsOffline(true);
        toast.error(t('access.offline_no_subscription_cache'));
        return;
      }
      setIsOffline(true);
      const offlineResult = validateOffline(eventId, {
        code: mode === 'TICKET' ? value : undefined,
        nfcTagId: mode === 'NFC' ? value : undefined,
      });
      const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      const synthetic: ScanResponse = {
        granted: offlineResult.granted,
        result: offlineResult.result,
        reason: offlineResult.reason,
        log: {
          id: localId,
          eventId,
          gateId,
          scanType: 'TICKET',
          ticketId: null,
          subscriptionId: null,
          rawCode: value,
          result: offlineResult.result,
          reason: offlineResult.reason,
          scannedById: authUser?.sub ?? '',
          scannedAt: nowIso,
          latencyMs: null,
        },
      };
      setLastResult(synthetic);
      setScanCount((c) => c + 1);
      if (offlineResult.granted) {
        pushOfflineQueue({
          localId,
          eventId,
          gateId,
          code: payload.code,
          nfcTagId: payload.nfcTagId,
          scannedLocallyAt: nowIso,
        });
        setPendingSync(getOfflineQueue());
        setInputValue('');
      }
    }
  };

  const handleCameraDetected = (code: string) => {
    if (!eventId || !gateId || scan.isPending) return;
    runScan(false, code);
  };

  const config = lastResult ? resultConfig[lastResult.result] : null;
  const canShowOverride = lastResult && !lastResult.granted && canOverride && lastResult.result !== 'WRONG_EVENT';

  return (
    <div className="relative space-y-6">
      {/* Flash plein écran vert/rouge XXL */}
      <AnimatePresence>
        {config && (
          <div
            key={scanCount}
            className={`animate-flash-pulse pointer-events-none fixed inset-0 z-[60] ${
              config.flash === 'green' ? 'bg-[#00875A]/25' : 'bg-red-500/30'
            }`}
          />
        )}
      </AnimatePresence>

      {/* En-tête du module */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00875A]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('access.badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('access.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('access.desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
              <WifiOff className="h-4 w-4" />
              {t('access.offline_mode')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#00875A] ring-1 ring-emerald-200">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('access.realtime')}
            </span>
          )}
          {pendingSync.length > 0 && (
            <Button
              variant="secondary"
              className="!py-1.5 !px-3.5 !text-xs font-bold"
              onClick={flushOfflineQueue}
              isLoading={isSyncing}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {pendingSync.length} {t('access.pending_sync_suffix')}
            </Button>
          )}
        </div>
      </div>

      {/* Cartes KPI Synthétiques du Contrôle d'Accès */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.kpi_validated')}</span>
            <Users className="h-5 w-5 text-[#00875A]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.validCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('access.kpi_validated_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.kpi_refused')}</span>
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{kpis.deniedCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('access.kpi_refused_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.kpi_total')}</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalScans}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('access.kpi_total_sub')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.kpi_mode')}</span>
            <ShieldCheck className={`h-5 w-5 ${gateStats.fault > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
          </div>
          <p className={`mt-2 text-xl font-extrabold ${gateStats.fault > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {event ? `${gateStats.online}/${gateStats.total}` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {gateStats.fault > 0
              ? `${gateStats.fault} ${t('access.gates_fault_suffix')}`
              : t('access.kpi_mode_sub')}
          </p>
        </div>
      </div>

      {/* Monitoring des obstacles physiques (module 6, lettre de conformité §4) */}
      {event && (gates?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t('access.gate_monitoring_title')}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {(gates ?? []).map((g) => {
              const dotColor =
                g.effectiveStatus === 'ONLINE' ? 'bg-[#00875A]' : g.effectiveStatus === 'FAULT' ? 'bg-red-500' : 'bg-slate-300';
              const nextStatus = g.effectiveStatus === 'FAULT' ? 'ONLINE' : 'FAULT';
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => gateHeartbeat.mutate({ gateId: g.id, status: nextStatus })}
                  title={t(nextStatus === 'FAULT' ? 'access.gate_report_fault' : 'access.gate_clear_fault')}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{g.name}</span>
                    <span className="block text-[10px] text-slate-400">{t(`access.gate_status.${g.effectiveStatus.toLowerCase()}` as TranslationKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sélection Événement & Porte */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:grid-cols-2">
        <Select label={t('access.event_label')} value={eventId} onChange={(e) => { setEventId(e.target.value); setGateId(''); }} className="text-xs">
          <option value="">{t('access.select_event')}</option>
          {publishedEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select label={t('access.gate_label')} value={gateId} disabled={!event} onChange={(e) => setGateId(e.target.value)} className="text-xs">
          <option value="">{t('access.select_gate')}</option>
          {(gates ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Zone de Scan & Caméra */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
          <button
            onClick={() => setMode('TICKET')}
            className={`rounded-lg px-4 py-2 transition-all ${mode === 'TICKET' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t('access.mode_ticket')}
          </button>
          <button
            onClick={() => setMode('NFC')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${mode === 'NFC' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <SmartphoneNfc className="h-3.5 w-3.5" />
            {t('access.mode_nfc')}
          </button>
          <button
            onClick={() => setMode('SUBSCRIPTION')}
            className={`rounded-lg px-4 py-2 transition-all ${mode === 'SUBSCRIPTION' ? 'bg-[#00875A] text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t('access.mode_subscription')}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1 !py-3 !text-sm font-mono font-bold"
            placeholder={
              mode === 'TICKET'
                ? t('access.scan_placeholder_ticket')
                : mode === 'NFC'
                  ? t('access.scan_placeholder_nfc')
                  : t('access.scan_placeholder_subscription')
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runScan(false)}
            autoFocus
          />
          <Button
            className="!px-6 !py-3 !text-sm font-bold bg-[#00875A] text-white hover:bg-[#00754e]"
            disabled={!canScan}
            isLoading={scan.isPending}
            onClick={() => runScan(false)}
          >
            <ScanLine className="h-5 w-5" />
            <span>{t('access.validate_scan')}</span>
          </Button>
        </div>

        {mode === 'TICKET' && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <CameraScanner onDetected={handleCameraDetected} disabled={!eventId || !gateId} />
            {(!eventId || !gateId) && (
              <p className="mt-2 text-xs text-slate-400 font-medium text-center">{t('access.select_event_gate_first')}</p>
            )}
          </div>
        )}
      </div>

      {/* Résultat du Dernier Scan (Bannière de Feedback XXL) */}
      <AnimatePresence mode="wait">
        {lastResult && config && (
          <motion.div
            key={scanCount}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative z-[61] flex flex-col items-center gap-4 rounded-2xl border p-8 text-center sm:flex-row sm:text-left shadow-lg ${
              config.tone === 'green'
                ? 'border-emerald-300 bg-emerald-50/90'
                : config.tone === 'amber'
                  ? 'border-amber-300 bg-amber-50/90'
                  : 'border-red-300 bg-red-50/90'
            }`}
          >
            <config.icon
              className={`h-16 w-16 shrink-0 ${config.tone === 'green' ? 'text-[#00875A]' : config.tone === 'amber' ? 'text-amber-600' : 'text-red-600'}`}
            />
            <div className="flex-1">
              <p
                className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${
                  config.tone === 'green' ? 'text-[#00875A]' : config.tone === 'amber' ? 'text-amber-800' : 'text-red-800'
                }`}
              >
                {t(config.labelKey)}
              </p>
              {lastResult.reason && <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{lastResult.reason}</p>}
            </div>
            {canShowOverride && (
              <Button variant="secondary" className="!py-3 !text-xs font-bold border-red-300 text-red-700 hover:bg-red-100" onClick={() => runScan(true)} isLoading={scan.isPending}>
                <ShieldAlert className="h-4 w-4" />
                <span>{t('access.force_emergency_entry')}</span>
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal des Passages en Direct */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00875A]" />
            </span>
            <span>{t('access.audit_log_title')}</span>
          </h2>
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('ui.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-0 bg-white dark:bg-slate-900 py-1.5 pl-9 pr-3 text-xs text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-[#00875A]"
            />
          </div>
        </div>

        {!eventId ? (
          <EmptyState message={t('access.choose_event_empty')} />
        ) : !filteredLogs?.length ? (
          <EmptyState message={t('access.no_scans_empty')} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.th_scan_time')}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.th_medium')}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.th_validation_result')}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('access.th_reason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence initial={false}>
                    {filteredLogs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, backgroundColor: 'rgba(0,135,90,0.1)' }}
                        animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.8 }}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{dateFormatter.format(new Date(log.scannedAt))}</td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{log.scanType === 'TICKET' ? t('access.scan_type_ticket') : t('access.scan_type_subscription')}</td>
                        <td className="px-5 py-4">
                          <Badge tone={resultConfig[log.result].tone} pulse={log.result === 'VALID'}>
                            {t(resultConfig[log.result].labelKey)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{log.reason ?? '—'}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


