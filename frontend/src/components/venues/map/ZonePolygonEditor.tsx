'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import type * as ReactKonva from 'react-konva';
import { MapPoint, Zone } from '@/lib/venue-types';

interface ZonePolygonEditorProps {
  zones: Zone[];
  /** Hauteur maximale d'affichage (px) */
  maxHeight?: number;
  /** Zone en cours de dessin */
  drawingZoneId?: string | null;
  drawingPoints?: MapPoint[];
  onCanvasClick?: (point: MapPoint) => void;
  onZoneClick?: (zoneId: string) => void;
  selectedZoneId?: string | null;
  /** Mode carte thermique (module 7) */
  heatmap?: Record<string, number>;
  fitContainer?: boolean;
}

function heatColor(rate: number): string {
  if (rate < 0.5) return '#10b981';
  if (rate < 0.85) return '#d4af37';
  return '#c1272d';
}

const NATIVE_WIDTH = 900;
const NATIVE_HEIGHT = 650;
const CX = 450;
const CY = 275;

function polygonCentroid(points: MapPoint[]): MapPoint {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) {
    const n = points.length;
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / n, y: sum.y / n };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function flatten(points: MapPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  heatRate?: number;
}

export default function ZonePolygonEditor({
  zones,
  maxHeight = 500,
  drawingZoneId,
  drawingPoints = [],
  onCanvasClick,
  onZoneClick,
  selectedZoneId = null,
  heatmap,
  fitContainer = true,
}: ZonePolygonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const zoneGroupRefs = useRef<Record<string, Konva.Group | null>>({});

  const [containerWidth, setContainerWidth] = useState(NATIVE_WIDTH);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [konvaMod, setKonvaMod] = useState<typeof ReactKonva | null>(null);

  useEffect(() => {
    // Dynamic import of react-konva on client mount to eliminate Next.js App Router ChunkLoadError (_next/undefined)
    import('react-konva').then((m) => setKonvaMod(m)).catch(() => {});
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.clientWidth > 0) {
      setContainerWidth(el.clientWidth);
    }
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = fitContainer ? containerWidth / NATIVE_WIDTH : 1;
  const displayWidth = fitContainer ? containerWidth : NATIVE_WIDTH;
  const displayHeight = fitContainer ? NATIVE_HEIGHT * scale : NATIVE_HEIGHT;

  if (!konvaMod) {
    return (
      <div ref={containerRef} className="flex h-[450px] w-full items-center justify-center rounded-2xl bg-slate-900/40">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00875A] border-t-transparent" />
          <span className="text-xs font-semibold">Chargement du plan 2D...</span>
        </div>
      </div>
    );
  }

  const { Stage, Layer, Group, Line, Rect, Circle } = konvaMod;

  const animateZoneScale = (zoneId: string, s: number) => {
    zoneGroupRefs.current[zoneId]?.to({ scaleX: s, scaleY: s, duration: 0.2 });
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!onCanvasClick) return;
    if (e.target !== e.target.getStage()) return;
    const stage = stageRef.current;
    const pos = stage?.getRelativePointerPosition();
    if (pos) onCanvasClick({ x: Math.round(pos.x), y: Math.round(pos.y) });
  };

  const setPointerCursor = (cursor: string) => (e: Konva.KonvaEventObject<Event>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  const showTooltip = (zone: Zone, e: Konva.KonvaEventObject<MouseEvent>) => {
    const wrapper = containerRef.current;
    if (!wrapper) return;
    const bounds = wrapper.getBoundingClientRect();
    setTooltip({
      x: e.evt.clientX - bounds.left,
      y: e.evt.clientY - bounds.top,
      name: zone.name,
      heatRate: heatmap?.[zone.id],
    });
  };

  const Pitch = () => {
    const w = 160;
    const h = 100;
    const x = CX - w / 2;
    const y = CY - h / 2;
    return (
      <Group listening={false}>
        <Rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="rgba(2,6,23,0.55)" cornerRadius={6} />
        <Rect x={x} y={y} width={w} height={h} fill="#16a34a" stroke="#ffffff" strokeWidth={2} cornerRadius={2} />
        <Line points={[CX, y, CX, y + h]} stroke="#ffffff" strokeWidth={1.5} />
        <Circle x={CX} y={CY} radius={16} stroke="#ffffff" strokeWidth={1.5} />
        <Circle x={CX} y={CY} radius={1.5} fill="#ffffff" />
        <Rect x={x} y={CY - 28} width={22} height={56} stroke="#ffffff" strokeWidth={1.5} />
        <Rect x={x + w - 22} y={CY - 28} width={22} height={56} stroke="#ffffff" strokeWidth={1.5} />
      </Group>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ maxHeight }}>
      <Stage
        ref={stageRef}
        width={displayWidth || undefined}
        height={displayHeight || undefined}
        scaleX={scale}
        scaleY={scale}
        draggable={!drawingZoneId}
        onClick={handleStageClick}
        onTap={handleStageClick}
        className="mx-auto"
      >
        <Layer>
          <Pitch />

          {zones.map((zone) => {
            if (zone.id === drawingZoneId) return null;
            const points = zone.mapPolygon ?? [];
            if (points.length < 3) return null;

            const center = polygonCentroid(points);
            const heatRate = heatmap?.[zone.id];
            const baseColor = heatRate !== undefined ? heatColor(heatRate) : zone.colorHex ?? '#94a3b8';

            return (
              <Group
                key={zone.id}
                ref={(node: Konva.Group | null) => {
                  zoneGroupRefs.current[zone.id] = node;
                }}
                x={center.x}
                y={center.y}
                offsetX={center.x}
                offsetY={center.y}
                onClick={() => onZoneClick?.(zone.id)}
                onTap={() => onZoneClick?.(zone.id)}
                onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  setHoveredZoneId(zone.id);
                  setPointerCursor('pointer')(e);
                  animateZoneScale(zone.id, 1.02);
                  showTooltip(zone, e);
                }}
                onMouseMove={(e: Konva.KonvaEventObject<MouseEvent>) => showTooltip(zone, e)}
                onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  setHoveredZoneId((current) => (current === zone.id ? null : current));
                  setPointerCursor('default')(e);
                  animateZoneScale(zone.id, 1);
                  setTooltip(null);
                }}
              >
                <Line
                  points={flatten(points)}
                  closed
                  fill={selectedZoneId === zone.id ? `${baseColor}E6` : hoveredZoneId === zone.id ? `${baseColor}B3` : `${baseColor}66`}
                  stroke={selectedZoneId === zone.id ? '#c1272d' : hoveredZoneId === zone.id ? '#ffffff' : 'rgba(226,232,240,0.55)'}
                  strokeWidth={selectedZoneId === zone.id ? 4 : hoveredZoneId === zone.id ? 3 : 1.5}
                />
              </Group>
            );
          })}

          {drawingZoneId && drawingPoints.length > 0 && (
            <>
              <Line
                points={flatten(drawingPoints)}
                stroke="#c1272d"
                strokeWidth={2}
                closed={drawingPoints.length > 2}
                fill="#c1272d33"
              />
              {drawingPoints.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={5} fill="#c1272d" stroke="#ffffff" strokeWidth={1} />
              ))}
            </>
          )}
        </Layer>
      </Stage>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          {tooltip.name}
          {tooltip.heatRate !== undefined && (
            <span className="ml-1.5 font-normal text-slate-400">— {Math.round(tooltip.heatRate * 100)}% rempli</span>
          )}
        </div>
      )}
    </div>
  );
}
