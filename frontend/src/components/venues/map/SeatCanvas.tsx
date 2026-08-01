'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Row, Seat, SeatStatus } from '@/lib/venue-types';
import { useI18nStore } from '@/store/i18n-store';

interface SeatCanvasProps {
  rows: Row[];
  width?: number;
  height?: number;
  selectedSeatIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** Glisser-déposer terminé : nouvelle position à persister. */
  onSeatDragEnd?: (seatId: string, x: number, y: number) => void;
  /** Repositionnement (droit `venues:update`) */
  canDragSeats?: boolean;
  /** Guichet tactile (module 5) */
  multiSelectMode?: boolean;
}

const SEAT_RADIUS = 10;
const LABEL_OFFSET_X = 50;

export const seatStatusColors: Record<SeatStatus, string> = {
  AVAILABLE: '#22c55e',
  RESERVED: '#eab308',
  SOLD: '#3b82f6',
  OUT_OF_SERVICE: '#ef4444',
};

interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function SeatCanvas({
  rows,
  width = 900,
  height = 550,
  selectedSeatIds,
  onSelectionChange,
  onSeatDragEnd,
  canDragSeats = true,
  multiSelectMode = false,
}: SeatCanvasProps) {
  const t = useI18nStore((s) => s.t);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(width);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [konvaMod, setKonvaMod] = useState<any>(null);

  useEffect(() => {
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

  const scale = containerWidth < width ? containerWidth / width : 1;
  const displayWidth = containerWidth < width ? containerWidth : width;
  const displayHeight = containerWidth < width ? height * scale : height;

  if (!konvaMod) {
    return (
      <div ref={containerRef} style={{ width: '100%', height }} className="flex items-center justify-center rounded-2xl bg-slate-900/40">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00875A] border-t-transparent" />
          <span className="text-xs font-semibold">Chargement de la vue des sièges...</span>
        </div>
      </div>
    );
  }

  const { Stage, Layer, Group, Circle, Rect, Text } = konvaMod;

  const allSeats = rows.flatMap((r) =>
    (r.seats ?? []).map((s) => ({ id: s.id, x: (s.x ?? 0) + LABEL_OFFSET_X, y: s.y ?? 0 })),
  );

  const setPointerCursor = (cursor: string) => (e: any) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  const handleStageMouseDown = (e: any) => {
    if (e.target !== e.target.getStage()) return;
    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;
    setMarqueeStart(pos);
    setMarquee({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setDidDrag(false);
  };

  const handleStageMouseMove = (e: any) => {
    if (!marqueeStart) return;
    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;
    setDidDrag(true);
    setMarquee({
      x: Math.min(marqueeStart.x, pos.x),
      y: Math.min(marqueeStart.y, pos.y),
      w: Math.abs(pos.x - marqueeStart.x),
      h: Math.abs(pos.y - marqueeStart.y),
    });
  };

  const handleStageMouseUp = () => {
    if (!marquee) {
      setMarqueeStart(null);
      return;
    }
    if (!didDrag || (marquee.w < 4 && marquee.h < 4)) {
      onSelectionChange(new Set());
    } else {
      const within = allSeats.filter(
        (s) => s.x >= marquee.x && s.x <= marquee.x + marquee.w && s.y >= marquee.y && s.y <= marquee.y + marquee.h,
      );
      onSelectionChange(new Set(within.map((s) => s.id)));
    }
    setMarquee(null);
    setMarqueeStart(null);
    setDidDrag(false);
  };

  const handleSeatClick = (seat: Seat, shiftKey: boolean) => {
    if (shiftKey || multiSelectMode) {
      const next = new Set(selectedSeatIds);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      onSelectionChange(next);
    } else {
      onSelectionChange(new Set([seat.id]));
    }
  };

  const handleRowLabelClick = (row: Row) => {
    onSelectionChange(new Set((row.seats ?? []).map((s) => s.id)));
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <Stage
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
      <Layer>
        <Text
          x={0}
          y={4}
          width={width}
          align="center"
          text={t('venues.canvas.pitch_side')}
          fontSize={12}
          fontStyle="bold"
          fill="#16a34a"
          listening={false}
        />

        {rows.map((row) => {
          const firstSeatY = row.seats?.[0]?.y ?? row.orderIndex * 40;
          return (
            <Group key={row.id}>
              <Text
                x={4}
                y={firstSeatY - 5}
                text={row.label}
                fontSize={11}
                fontStyle="bold"
                fill="#e2e8f0"
                onClick={() => handleRowLabelClick(row)}
                onTap={() => handleRowLabelClick(row)}
                onMouseEnter={setPointerCursor('pointer')}
                onMouseLeave={setPointerCursor('default')}
              />
              {(row.seats ?? []).map((seat) => {
                const isSelected = selectedSeatIds.has(seat.id);
                return (
                  <Group
                    key={seat.id}
                    x={(seat.x ?? 0) + LABEL_OFFSET_X}
                    y={seat.y ?? 0}
                    draggable={canDragSeats}
                    onDragEnd={(e: any) =>
                      onSeatDragEnd?.(seat.id, Math.round(e.target.x() - LABEL_OFFSET_X), Math.round(e.target.y()))
                    }
                    onClick={(e: any) => handleSeatClick(seat, e.evt.shiftKey)}
                    onTap={() => handleSeatClick(seat, false)}
                    onMouseEnter={setPointerCursor(canDragSeats ? 'grab' : 'pointer')}
                    onMouseLeave={setPointerCursor('default')}
                  >
                    {isSelected && <Circle radius={SEAT_RADIUS + 4} stroke="#c1272d" strokeWidth={2} dash={[3, 2]} />}
                    <Circle radius={SEAT_RADIUS} fill={seatStatusColors[seat.status]} stroke="#ffffff" strokeWidth={1.5} />
                    <Text
                      text={String(seat.number)}
                      fontSize={8}
                      fill="#ffffff"
                      width={SEAT_RADIUS * 2}
                      offsetX={SEAT_RADIUS}
                      offsetY={3}
                      align="center"
                      listening={false}
                    />
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {marquee && (marquee.w > 2 || marquee.h > 2) && (
          <Rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.w}
            height={marquee.h}
            fill="#c1272d1A"
            stroke="#c1272d"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
    </div>
  );
}
