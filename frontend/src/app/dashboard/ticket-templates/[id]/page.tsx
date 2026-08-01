'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Barcode, Image as ImageIcon, QrCode, Trash2, Type, Layout, Save, Printer } from 'lucide-react';
import { useTicketTemplate, useUpdateTicketTemplate } from '@/hooks/useTicketTemplates';
import { useAuthStore } from '@/store/auth-store';
import { useI18nStore } from '@/store/i18n-store';
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
    <div className="flex h-[300px] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
      <Spinner className="h-6 w-6 text-[#00875A]" />
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

function newElement(type: TemplateElementType, isEn: boolean): TemplateElement {
  const base = { id: crypto.randomUUID(), x: 20, y: 20, width: 160, height: 30 };
  if (type === 'text') return { ...base, type, staticText: isEn ? 'New text' : 'Nouveau texte', fontSize: 14, color: '#000000', align: 'left' };
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
  const { lang, t } = useI18nStore();

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
    const el = newElement(type, lang === 'EN');
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
        <Spinner className="h-6 w-6 text-[#00875A]" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={
          error instanceof ApiError
            ? `${t('templates.designer.error_loading')}: ${error.message}`
            : t('templates.designer.error_loading_generic')
        }
      />
    );
  }

  if (!template) {
    return <EmptyState message={t('templates.designer.not_found')} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/ticket-templates"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#00875A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('templates.designer.back_to_catalog')}</span>
      </Link>

      {/* Barre Supérieure du Studio */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layout className="h-4.5 w-4.5 text-[#00875A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">
              {t('templates.designer.studio_badge')}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/ticket-templates/${templateId}/generate`}>
            <Button variant="secondary" className="text-xs">
              <Printer className="h-4 w-4" />
              <span>{t('templates.designer.generate_ticket')}</span>
            </Button>
          </Link>
          {canUpdate && (
            <Button onClick={save} isLoading={updateTemplate.isPending} className="bg-[#00875A] text-white hover:bg-[#00754e]">
              <Save className="h-4 w-4" />
              <span>{t('templates.designer.save_template')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Propriétés de Base du Gabarit */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs sm:grid-cols-5">
        <Input
          label={t('templates.designer.template_name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canUpdate}
        />
        <Input
          label={t('ui.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canUpdate}
        />
        <Input
          type="number"
          label={t('templates.designer.width_px')}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          disabled={!canUpdate}
        />
        <Input
          type="number"
          label={t('templates.designer.height_px')}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          disabled={!canUpdate}
        />
        <Input
          type="color"
          label={t('templates.designer.background_color')}
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          disabled={!canUpdate}
        />
      </div>

      {/* Barre d'Outils d'Ajout d'Éléments */}
      {canUpdate && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-3 shadow-xs">
          <Button variant="secondary" onClick={() => addElement('text')} className="text-xs">
            <Type className="h-4 w-4 text-[#00875A]" />
            <span>{t('templates.designer.add_text')}</span>
          </Button>
          <Button variant="secondary" onClick={() => addElement('image')} className="text-xs">
            <ImageIcon className="h-4 w-4 text-blue-600" />
            <span>{t('templates.designer.add_image')}</span>
          </Button>
          <Button variant="secondary" onClick={() => addElement('qrcode')} className="text-xs">
            <QrCode className="h-4 w-4 text-purple-600" />
            <span>{t('templates.designer.add_qrcode')}</span>
          </Button>
          <Button variant="secondary" onClick={() => addElement('barcode')} className="text-xs">
            <Barcode className="h-4 w-4 text-amber-600" />
            <span>{t('templates.designer.add_barcode')}</span>
          </Button>
          {selected && (
            <Button variant="ghost" onClick={removeSelected} className="ml-auto text-xs text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              <span>{t('templates.designer.delete_element')}</span>
            </Button>
          )}
        </div>
      )}

      {/* Zone Canvas & Inspecteur de Propriétés */}
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="overflow-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex-1">
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
          <div className="w-full shrink-0 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs lg:w-80 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {t('templates.designer.element_properties')}
            </h3>
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
                  label={t('templates.designer.width')}
                  value={selected.width}
                  onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label={t('templates.designer.height')}
                  value={selected.height}
                  onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })}
                />
              </div>

              {selected.type === 'text' && (
                <>
                  <Input
                    label={t('templates.designer.static_text')}
                    value={selected.staticText ?? ''}
                    onChange={(e) => updateElement(selected.id, { staticText: e.target.value })}
                    placeholder={t('templates.designer.static_text_placeholder')}
                  />
                  <Select
                    label={t('templates.designer.dynamic_field_binding')}
                    value={selected.binding ?? ''}
                    onChange={(e) => updateElement(selected.id, { binding: e.target.value || undefined })}
                    className="text-xs"
                  >
                    <option value="">{t('templates.designer.none_static')}</option>
                    {bindingPresets.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label={t('templates.designer.font_size')}
                      value={selected.fontSize ?? 14}
                      onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                    />
                    <Input
                      type="color"
                      label={t('templates.designer.color')}
                      value={selected.color ?? '#000000'}
                      onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label={t('templates.designer.weight')}
                      value={selected.fontWeight ?? 'normal'}
                      onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value as 'normal' | 'bold' })}
                      className="text-xs"
                    >
                      <option value="normal">{t('templates.designer.normal')}</option>
                      <option value="bold">{t('templates.designer.bold')}</option>
                    </Select>
                    <Select
                      label={t('templates.designer.alignment')}
                      value={selected.align ?? 'left'}
                      onChange={(e) => updateElement(selected.id, { align: e.target.value as 'left' | 'center' | 'right' })}
                      className="text-xs"
                    >
                      <option value="left">{t('templates.designer.align_left')}</option>
                      <option value="center">{t('templates.designer.align_center')}</option>
                      <option value="right">{t('templates.designer.align_right')}</option>
                    </Select>
                  </div>
                </>
              )}

              {selected.type === 'image' && (
                <Input
                  label={t('templates.designer.image_url')}
                  value={selected.imageUrl ?? ''}
                  onChange={(e) => updateElement(selected.id, { imageUrl: e.target.value })}
                  placeholder="https://…"
                />
              )}

              {(selected.type === 'qrcode' || selected.type === 'barcode') && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800/80">
                  {t('templates.designer.qr_barcode_hint')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


