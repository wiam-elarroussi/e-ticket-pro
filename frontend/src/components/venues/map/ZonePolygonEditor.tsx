'use client';

import { useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import { MapPoint, Zone } from '@/lib/venue-types';

interface ZonePolygonEditorProps {
  zones: Zone[];
  width?: number;
  height?: number;
  /** Zone en cours de dessin (masquée du rendu "vue" pendant l'édition). */
  drawingZoneId?: string | null;
  drawingPoints?: MapPoint[];
  onCanvasClick?: (point: MapPoint) => void;
  onZoneClick?: (zoneId: string) => void;
  /** Zone actuellement retenue ailleurs dans l'UI (ex: guichet POS) — mise en évidence persistante, indépendante du survol. */
  selectedZoneId?: string | null;
}

// Même repère que le script de peuplement (backend/venue-service) : ne pas
// changer ces constantes sans re-générer les polygones déjà enregistrés.
const CX = 450;
const CY = 275;

/** Centroïde pondéré par l'aire (formule du shoelace) — bien plus fiable que
 * la simple moyenne des sommets pour des polygones irréguliers (bandes en arc). */
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

function boundingBox(points: MapPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function flatten(points: MapPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/** Pelouse schématique au centre du plan, pour orienter la lecture du stade. */
function Pitch() {
  const w = 160;
  const h = 100;
  const x = CX - w / 2;
  const y = CY - h / 2;
  return (
    <Group listening={false}>
      <Rect x={x} y={y} width={w} height={h} fill="#2e7d32" stroke="#ffffff" strokeWidth={2} cornerRadius={2} />
      {/* Ligne médiane */}
      <Line points={[CX, y, CX, y + h]} stroke="#ffffff" strokeWidth={1.5} />
      {/* Rond central */}
      <Circle x={CX} y={CY} radius={16} stroke="#ffffff" strokeWidth={1.5} />
      <Circle x={CX} y={CY} radius={1.5} fill="#ffffff" />
      {/* Surfaces de réparation */}
      <Rect x={x} y={CY - 28} width={22} height={56} stroke="#ffffff" strokeWidth={1.5} />
      <Rect x={x + w - 22} y={CY - 28} width={22} height={56} stroke="#ffffff" strokeWidth={1.5} />
      <Text x={CX - 20} y={y + h + 6} width={40} align="center" text="⚽" fontSize={14} />
    </Group>
  );
}

/**
 * Plan 2D de l'enceinte : affiche le contour de chaque zone (dessiné à la
 * souris) coloré selon Zone.colorHex. En mode dessin, chaque clic sur le
 * canevas (hors forme existante) ajoute un point au polygone en cours.
 */
export default function ZonePolygonEditor({
  zones,
  width = 900,
  height = 650,
  drawingZoneId,
  drawingPoints = [],
  onCanvasClick,
  onZoneClick,
  selectedZoneId = null,
}: ZonePolygonEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!onCanvasClick) return;
    // Ne capte que les clics dans le vide : les clics sur une zone existante
    // sont gérés par onZoneClick (navigation), pas par le mode dessin.
    if (e.target !== e.target.getStage()) return;
    const stage = stageRef.current;
    const pos = stage?.getRelativePointerPosition();
    if (pos) onCanvasClick({ x: Math.round(pos.x), y: Math.round(pos.y) });
  };

  const setPointerCursor = (cursor: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  const hoveredZone = zones.find((z) => z.id === hoveredZoneId);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      draggable={!drawingZoneId}
      onClick={handleStageClick}
      onTap={handleStageClick}
    >
      <Layer>
        <Pitch />

        {zones.map((zone) => {
          if (zone.id === drawingZoneId) return null;
          const points = zone.mapPolygon ?? [];
          if (points.length < 3) return null;

          const bbox = boundingBox(points);
          // La dimension la plus étroite (largeur pour les bandes Est/Ouest,
          // hauteur pour Nord/Sud) correspond à l'axe le long duquel les
          // zones voisines sont empilées : borner le label à cette taille
          // garantit qu'il ne peut jamais déborder sur la zone d'à côté.
          const minSide = Math.min(bbox.width, bbox.height);
          // Sous ce seuil, même tronqué le nom persistant resterait
          // illisible : on s'appuie uniquement sur l'infobulle au survol.
          const showPersistentLabel = minSide >= 40;
          const fontSize = minSide < 45 ? 9 : minSide < 90 ? 11 : 13;
          const labelWidth = Math.max(30, minSide - 10);
          const center = polygonCentroid(points);

          return (
            <Group
              key={zone.id}
              onClick={() => onZoneClick?.(zone.id)}
              onTap={() => onZoneClick?.(zone.id)}
              onMouseEnter={(e) => {
                setHoveredZoneId(zone.id);
                setPointerCursor('pointer')(e);
              }}
              onMouseLeave={(e) => {
                setHoveredZoneId((current) => (current === zone.id ? null : current));
                setPointerCursor('default')(e);
              }}
            >
              <Line
                points={flatten(points)}
                closed
                fill={selectedZoneId === zone.id ? `${zone.colorHex ?? '#94a3b8'}CC` : `${zone.colorHex ?? '#94a3b8'}80`}
                stroke={selectedZoneId === zone.id ? '#4F46E5' : zone.colorHex ?? '#64748b'}
                strokeWidth={selectedZoneId === zone.id ? 4 : hoveredZoneId === zone.id ? 3 : 2}
              />
              {showPersistentLabel && (
                <Group listening={false}>
                  <Rect
                    x={center.x - labelWidth / 2 - 3}
                    y={center.y - fontSize / 2 - 2}
                    width={labelWidth + 6}
                    height={fontSize + 4}
                    fill="#ffffff"
                    opacity={0.72}
                    cornerRadius={3}
                  />
                  <Text
                    x={center.x - labelWidth / 2}
                    y={center.y - fontSize / 2}
                    width={labelWidth}
                    align="center"
                    text={zone.name}
                    fontSize={fontSize}
                    fontStyle="bold"
                    fill="#1e293b"
                    ellipsis
                    wrap="none"
                  />
                </Group>
              )}
            </Group>
          );
        })}

        {/* Infobulle au survol : toujours lisible en entier, par-dessus tout le reste. */}
        {hoveredZone && hoveredZone.mapPolygon && hoveredZone.mapPolygon.length >= 3 && (
          (() => {
            const center = polygonCentroid(hoveredZone.mapPolygon);
            const labelWidth = Math.max(90, hoveredZone.name.length * 7 + 16);
            return (
              <Group x={center.x - labelWidth / 2} y={center.y - 12} listening={false}>
                <Rect width={labelWidth} height={24} fill="#1e293b" cornerRadius={4} opacity={0.92} />
                <Text
                  text={hoveredZone.name}
                  width={labelWidth}
                  height={24}
                  align="center"
                  verticalAlign="middle"
                  fontSize={12}
                  fontStyle="bold"
                  fill="#ffffff"
                />
              </Group>
            );
          })()
        )}

        {drawingZoneId && drawingPoints.length > 0 && (
          <>
            <Line
              points={flatten(drawingPoints)}
              stroke="#4F46E5"
              strokeWidth={2}
              closed={drawingPoints.length > 2}
              fill="#4F46E533"
            />
            {drawingPoints.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={5} fill="#4F46E5" stroke="#ffffff" strokeWidth={1} />
            ))}
          </>
        )}
      </Layer>
    </Stage>
  );
}
