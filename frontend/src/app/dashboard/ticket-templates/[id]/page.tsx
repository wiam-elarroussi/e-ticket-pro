'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Barcode, Image as ImageIcon, QrCode, Trash2, Type } from 'lucide-react';
import { useTicketTemplate, useUpdateTicketTemplate } from '@/hooks/useTicketTemplates';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TemplateElement, TemplateElementType } from '@/lib/template-types';

const TemplateCanvas = dynamic(() => import('@/components/templates/TemplateCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-lg bg-slate-50">
      <Spinner className="h-6 w-6 text-indigo-600" />
    </div>
  ),
});

const bindingPresets = [
  'event.name',
  'event.startAt',
  'event.homeTeam',
  'event.awayTeam',
  'venue.name',
  'seat.label',
  'buyer.fullName',
  'category.name',
  'price',
];

function newElement(type: TemplateElementType): TemplateElement {
  const base = { id: crypto.randomUUID(), x: 20, y: 20, width: 160, height: 30 };
  if (type === 'text') return { ...base, type, staticText: 'Nouveau texte', fontSize: 14, color: '#000000', align: 'left' };
  if (type === 'image') return { ...base, type, width: 100, height: 60 };
  return { ...base, type, width: 90, height: 90 };
}

export default function TicketTemplateDetailPage() {
  return (
    <RequirePermission permission="templates:read">
      <TicketTemplateDetailPageContent />
    </RequirePermission>
  );
}

function TicketTemplateDetailPageContent() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const { data: template, isLoading, isError, error } = useTicketTemplate(templateId);
  const updateTemplate = useUpdateTicketTemplate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('templates:update');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(300);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setWidth(template.width);
      setHeight(template.height);
      setBackgroundColor(template.backgroundColor);
      setElements(template.elements);
    }
  }, [template]);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const updateElement = (id: string, patch: Partial<TemplateElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const addElement = (type: TemplateElementType) => {
    const el = newElement(type);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  const save = () => {
    updateTemplate.mutate({
      id: templateId,
      payload: { name, description: description || undefined, width, height, backgroundColor, elements },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `Impossible de charger ce gabarit : ${error.message}`
            : 'Impossible de charger ce gabarit. Réessayez plus tard.'
        }
      />
    );
  }

  if (!template) {
    return <EmptyState message="Gabarit introuvable." />;
  }

  return (
    <div>
      <Link
        href="/dashboard/ticket-templates"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux gabarits
      </Link>

      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
          <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} disabled={!canUpdate} />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canUpdate}
          />
          <Input
            type="number"
            label="Largeur"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            disabled={!canUpdate}
          />
          <Input
            type="number"
            label="Hauteur"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            disabled={!canUpdate}
          />
          <Input
            type="color"
            label="Fond"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            disabled={!canUpdate}
          />
        </div>
        {canUpdate && (
          <Button onClick={save} isLoading={updateTemplate.isPending}>
            Enregistrer
          </Button>
        )}
      </div>

      {canUpdate && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <Button variant="secondary" onClick={() => addElement('text')}>
            <Type className="h-4 w-4" />
            Texte
          </Button>
          <Button variant="secondary" onClick={() => addElement('image')}>
            <ImageIcon className="h-4 w-4" />
            Image / Sponsor
          </Button>
          <Button variant="secondary" onClick={() => addElement('qrcode')}>
            <QrCode className="h-4 w-4" />
            QR Code
          </Button>
          <Button variant="secondary" onClick={() => addElement('barcode')}>
            <Barcode className="h-4 w-4" />
            Code-barres
          </Button>
          {selected && (
            <Button variant="ghost" onClick={removeSelected} className="ml-auto">
              <Trash2 className="h-4 w-4 text-red-600" />
              Supprimer l’élément sélectionné
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="overflow-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <TemplateCanvas
            width={width}
            height={height}
            backgroundColor={backgroundColor}
            elements={elements}
            selectedId={selectedId}
            onSelect={canUpdate ? setSelectedId : () => {}}
            onElementDragEnd={(id, x, y) => canUpdate && updateElement(id, { x, y })}
          />
        </div>

        {selected && canUpdate && (
          <div className="w-full shrink-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:w-72">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Propriétés de l’élément</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  label="X"
                  value={selected.x}
                  onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Y"
                  value={selected.y}
                  onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Largeur"
                  value={selected.width}
                  onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Hauteur"
                  value={selected.height}
                  onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })}
                />
              </div>

              {selected.type === 'text' && (
                <>
                  <Input
                    label="Texte fixe"
                    value={selected.staticText ?? ''}
                    onChange={(e) => updateElement(selected.id, { staticText: e.target.value })}
                    placeholder="Laisser vide si liaison dynamique"
                  />
                  <Select
                    label="Liaison dynamique (données du billet)"
                    value={selected.binding ?? ''}
                    onChange={(e) => updateElement(selected.id, { binding: e.target.value || undefined })}
                  >
                    <option value="">Aucune (texte fixe)</option>
                    {bindingPresets.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label="Taille police"
                      value={selected.fontSize ?? 14}
                      onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                    />
                    <Input
                      type="color"
                      label="Couleur"
                      value={selected.color ?? '#000000'}
                      onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Graisse"
                      value={selected.fontWeight ?? 'normal'}
                      onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value as 'normal' | 'bold' })}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Gras</option>
                    </Select>
                    <Select
                      label="Alignement"
                      value={selected.align ?? 'left'}
                      onChange={(e) => updateElement(selected.id, { align: e.target.value as 'left' | 'center' | 'right' })}
                    >
                      <option value="left">Gauche</option>
                      <option value="center">Centré</option>
                      <option value="right">Droite</option>
                    </Select>
                  </div>
                </>
              )}

              {selected.type === 'image' && (
                <Input
                  label="URL de l’image (logo/sponsor)"
                  value={selected.imageUrl ?? ''}
                  onChange={(e) => updateElement(selected.id, { imageUrl: e.target.value })}
                  placeholder="https://…"
                />
              )}

              {(selected.type === 'qrcode' || selected.type === 'barcode') && (
                <p className="text-xs text-slate-400">
                  Généré automatiquement à partir du code sécurisé lors de la création de chaque billet — aucune
                  configuration supplémentaire ici.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/dashboard/ticket-templates/${templateId}/generate`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Générer un billet à partir de ce gabarit →
        </Link>
      </div>
    </div>
  );
}
