'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ScanLine, ShieldAlert, XCircle } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useGates } from '@/hooks/useGates';
import { useScan, useAccessLogs } from '@/hooks/useAccess';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { ScanResponse, ScanResult } from '@/lib/access-types';

type ScanMode = 'TICKET' | 'SUBSCRIPTION';

const resultConfig: Record<
  ScanResult,
  { label: string; tone: 'green' | 'red' | 'amber'; icon: typeof CheckCircle2 }
> = {
  VALID: { label: 'VALIDE', tone: 'green', icon: CheckCircle2 },
  OVERRIDDEN: { label: 'ENTRÉE FORCÉE', tone: 'amber', icon: ShieldAlert },
  ALREADY_SCANNED: { label: 'DÉJÀ SCANNÉ', tone: 'red', icon: XCircle },
  INVALID: { label: 'INVALIDE / FRAUDULEUX', tone: 'red', icon: AlertTriangle },
  CANCELLED: { label: 'BILLET ANNULÉ', tone: 'red', icon: AlertTriangle },
  WRONG_EVENT: { label: 'MAUVAIS ÉVÉNEMENT', tone: 'red', icon: AlertTriangle },
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
  const canOverride = hasPermission('access:override');
  const scan = useScan();

  const publishedEvents = (events ?? []).filter((e) => e.status === 'PUBLISHED');

  const [eventId, setEventId] = useState('');
  const [gateId, setGateId] = useState('');
  const [mode, setMode] = useState<ScanMode>('TICKET');
  const [inputValue, setInputValue] = useState('');
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);

  const event = events?.find((e) => e.id === eventId);
  const { data: gates } = useGates(event?.venueId);
  const { data: logs } = useAccessLogs(eventId, gateId || undefined);

  const canScan = !!eventId && !!gateId && inputValue.trim().length > 0;

  const runScan = (force = false) => {
    if (!canScan) return;
    scan.mutate(
      {
        eventId,
        gateId,
        code: mode === 'TICKET' ? inputValue.trim() : undefined,
        subscriptionId: mode === 'SUBSCRIPTION' ? inputValue.trim() : undefined,
        force,
      },
      {
        onSuccess: (res) => {
          setLastResult(res);
          setInputValue('');
        },
      },
    );
  };

  const config = lastResult ? resultConfig[lastResult.result] : null;
  const canShowOverride = lastResult && !lastResult.granted && canOverride && lastResult.result !== 'WRONG_EVENT';

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Contrôle d’accès</h1>
      <p className="mb-6 text-sm text-slate-500">Scan billet / abonnement — validation instantanée à la porte.</p>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
        <Select label="Événement" value={eventId} onChange={(e) => { setEventId(e.target.value); setGateId(''); }}>
          <option value="">Choisir…</option>
          {publishedEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select label="Porte" value={gateId} disabled={!event} onChange={(e) => setGateId(e.target.value)}>
          <option value="">Choisir…</option>
          {(gates ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex w-fit rounded-lg bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setMode('TICKET')}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === 'TICKET' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Billet (QR / code)
          </button>
          <button
            onClick={() => setMode('SUBSCRIPTION')}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === 'SUBSCRIPTION' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Abonnement
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            placeholder={mode === 'TICKET' ? 'Code du billet (saisie manuelle ou douchette)' : 'Identifiant abonnement'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runScan(false)}
            autoFocus
          />
          <Button disabled={!canScan} isLoading={scan.isPending} onClick={() => runScan(false)}>
            <ScanLine className="h-4 w-4" />
            Scanner
          </Button>
        </div>
      </div>

      {lastResult && config && (
        <div
          className={`mb-4 flex items-center gap-4 rounded-xl p-6 ring-2 ${
            config.tone === 'green'
              ? 'bg-green-50 ring-green-500'
              : config.tone === 'amber'
                ? 'bg-amber-50 ring-amber-500'
                : 'bg-red-50 ring-red-500'
          }`}
        >
          <config.icon
            className={`h-14 w-14 ${config.tone === 'green' ? 'text-green-600' : config.tone === 'amber' ? 'text-amber-600' : 'text-red-600'}`}
          />
          <div className="flex-1">
            <p
              className={`text-2xl font-bold ${config.tone === 'green' ? 'text-green-800' : config.tone === 'amber' ? 'text-amber-800' : 'text-red-800'}`}
            >
              {config.label}
            </p>
            {lastResult.reason && <p className="text-sm text-slate-600">{lastResult.reason}</p>}
          </div>
          {canShowOverride && (
            <Button variant="secondary" onClick={() => runScan(true)} isLoading={scan.isPending}>
              <ShieldAlert className="h-4 w-4" />
              Forcer l’entrée
            </Button>
          )}
        </div>
      )}

      <h2 className="mb-3 font-medium text-slate-900">Derniers scans à cette porte</h2>
      {!eventId ? (
        <EmptyState message="Choisissez un événement pour voir l'historique." />
      ) : !logs?.length ? (
        <EmptyState message="Aucun scan enregistré." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Heure</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Résultat</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-500">{dateFormatter.format(new Date(log.scannedAt))}</td>
                    <td className="px-4 py-3 text-slate-500">{log.scanType === 'TICKET' ? 'Billet' : 'Abonnement'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={resultConfig[log.result].tone}>{resultConfig[log.result].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
