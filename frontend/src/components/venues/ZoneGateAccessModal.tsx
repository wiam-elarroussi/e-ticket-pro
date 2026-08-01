'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSetZoneGateAccess } from '@/hooks/useZones';
import { Gate, Zone } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

interface ZoneGateAccessModalProps {
  open: boolean;
  onClose: () => void;
  zone: Zone | null;
  gates: Gate[];
}

export function ZoneGateAccessModal({ open, onClose, zone, gates }: ZoneGateAccessModalProps) {
  const setGateAccess = useSetZoneGateAccess();
  const t = useI18nStore((s) => s.t);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(zone?.gateAccess?.map((ga) => ga.gateId) ?? []));
    }
  }, [open, zone]);

  if (!zone) return null;

  const toggle = (gateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gateId)) next.delete(gateId);
      else next.add(gateId);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t('venues.form.zone_gate_access_title')} — ${zone.name}`}>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {t('venues.form.zone_gate_access_desc')}
      </p>
      {gates.length === 0 ? (
        <p className="text-sm text-slate-400">{t('venues.form.no_gates_defined')}</p>
      ) : (
        <div className="space-y-2">
          {gates.map((gate) => (
            <label key={gate.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-slate-700"
                checked={selected.has(gate.id)}
                onChange={() => toggle(gate.id)}
              />
              {gate.name} {gate.code && <span className="text-slate-400">({gate.code})</span>}
            </label>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('ui.cancel')}
        </Button>
        <Button
          isLoading={setGateAccess.isPending}
          onClick={() =>
            setGateAccess.mutate(
              { id: zone.id, gateIds: Array.from(selected) },
              { onSuccess: () => onClose() },
            )
          }
        >
          {t('ui.save')}
        </Button>
      </div>
    </Modal>
  );
}
