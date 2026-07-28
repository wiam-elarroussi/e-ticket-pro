'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSetZoneGateAccess } from '@/hooks/useZones';
import { Gate, Zone } from '@/lib/venue-types';

interface ZoneGateAccessModalProps {
  open: boolean;
  onClose: () => void;
  zone: Zone | null;
  gates: Gate[];
}

export function ZoneGateAccessModal({ open, onClose, zone, gates }: ZoneGateAccessModalProps) {
  const setGateAccess = useSetZoneGateAccess();
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
    <Modal open={open} onClose={onClose} title={`Portes donnant accès — ${zone.name}`}>
      <p className="mb-4 text-sm text-slate-500">
        Sélectionnez les portes physiques permettant d’atteindre cette zone. Utilisé par le futur contrôle d’accès
        (module 6) pour valider qu’un billet est scanné à une entrée autorisée.
      </p>
      {gates.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune porte définie pour cette enceinte.</p>
      ) : (
        <div className="space-y-2">
          {gates.map((gate) => (
            <label key={gate.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
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
          Annuler
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
          Enregistrer
        </Button>
      </div>
    </Modal>
  );
}
