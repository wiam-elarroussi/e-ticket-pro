'use client';

import { Group, Layer, Rect, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import { TemplateElement } from '@/lib/template-types';

interface TemplateCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl?: string | null;
  elements: TemplateElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onElementDragEnd: (id: string, x: number, y: number) => void;
}

const typeLabels: Record<TemplateElement['type'], string> = {
  text: 'Texte',
  image: 'Image',
  qrcode: 'QR Code',
  barcode: 'Code-barres',
};

function elementDisplayText(el: TemplateElement): string {
  if (el.type !== 'text') return typeLabels[el.type];
  if (el.staticText) return el.staticText;
  if (el.binding) return `{{${el.binding}}}`;
  return 'Texte vide';
}

/** Aperçu de gabarit : les éléments qrcode/image sont des espaces réservés (le rendu réel se fait au moment de la génération d'un billet, avec de vraies données). */
export default function TemplateCanvas({
  width,
  height,
  backgroundColor,
  elements,
  selectedId,
  onSelect,
  onElementDragEnd,
}: TemplateCanvasProps) {
  const setPointerCursor = (cursor: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
    >
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill={backgroundColor} stroke="#cbd5e1" strokeWidth={1} />

        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          const isPlaceholder = el.type !== 'text';
          return (
            <Group
              key={el.id}
              x={el.x}
              y={el.y}
              draggable
              onDragEnd={(e) => onElementDragEnd(el.id, Math.round(e.target.x()), Math.round(e.target.y()))}
              onClick={() => onSelect(el.id)}
              onTap={() => onSelect(el.id)}
              onMouseEnter={setPointerCursor('move')}
              onMouseLeave={setPointerCursor('default')}
            >
              <Rect
                width={el.width}
                height={el.height}
                fill={isPlaceholder ? '#f1f5f9' : undefined}
                stroke={isSelected ? '#4F46E5' : '#94a3b8'}
                strokeWidth={isSelected ? 2 : 1}
                dash={isPlaceholder ? [4, 3] : undefined}
              />
              <Text
                text={elementDisplayText(el)}
                width={el.width}
                height={el.height}
                align={el.type === 'text' ? (el.align ?? 'left') : 'center'}
                verticalAlign="middle"
                padding={4}
                fontSize={el.type === 'text' ? el.fontSize ?? 14 : 12}
                fontStyle={el.type === 'text' && el.fontWeight === 'bold' ? 'bold' : 'normal'}
                fill={el.type === 'text' ? el.color ?? '#000000' : '#64748b'}
                listening={false}
                ellipsis
                wrap="none"
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
