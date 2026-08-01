import { Injectable, NotFoundException } from '@nestjs/common';
import { Gate, GateDeviceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';
import { GateHeartbeatDto } from './dto/gate-heartbeat.dto';

/** Au-delà de ce délai sans battement de vie, une porte déclarée ONLINE est
 * considérée effectivement hors-ligne (silence prolongé = poste probablement éteint/déconnecté). */
const HEARTBEAT_STALE_MS = 2 * 60 * 1000;

@Injectable()
export class GatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGateDto) {
    return this.prisma.gate.create({ data: dto });
  }

  async findAll(venueId?: string) {
    const gates = await this.prisma.gate.findMany({
      where: venueId ? { venueId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return gates.map((g) => this.withEffectiveStatus(g));
  }

  /**
   * Statut affiché au monitoring (module 6, lettre de conformité §4) : dérivé
   * de l'ancienneté du dernier battement de vie, pas simplement du dernier
   * statut déclaré — un poste qui ne répond plus n'est pas "en ligne" juste
   * parce que personne n'a explicitement dit le contraire. FAULT (panne
   * signalée par un opérateur) n'est jamais masqué par cette logique.
   */
  private withEffectiveStatus(gate: Gate) {
    let effectiveStatus: GateDeviceStatus = gate.deviceStatus;
    if (gate.deviceStatus === 'ONLINE') {
      const isStale = !gate.lastHeartbeatAt || Date.now() - gate.lastHeartbeatAt.getTime() > HEARTBEAT_STALE_MS;
      if (isStale) effectiveStatus = 'OFFLINE';
    }
    return { ...gate, effectiveStatus };
  }

  /** Battement de vie du poste de contrôle d'une porte — déclenché à chaque
   * scan réel (module 6 access-service) ou déclaration manuelle de panne. */
  async heartbeat(gateId: string, dto: GateHeartbeatDto) {
    await this.assertExists(gateId);
    const gate = await this.prisma.gate.update({
      where: { id: gateId },
      data: { deviceStatus: dto.status, lastHeartbeatAt: new Date() },
    });
    return this.withEffectiveStatus(gate);
  }

  async update(id: string, dto: UpdateGateDto) {
    await this.assertExists(id);
    return this.prisma.gate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.gate.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const gate = await this.prisma.gate.findUnique({ where: { id } });
    if (!gate) {
      throw new NotFoundException('Porte introuvable');
    }
    return gate;
  }

  /**
   * Contrôle d'accréditation physique (module 6, lettre de conformité §1
   * "Gestion des Accréditations") : une porte dont l'accès aux zones a été
   * configuré (gate_zone_access) ne doit laisser entrer que les détenteurs
   * de billets dont le siège appartient à une de ces zones — ex: la porte VIP
   * ne dessert que la tribune VIP. Une porte SANS configuration explicite
   * (aucune ligne dans gate_zone_access) reste ouverte à toutes les zones,
   * pour rester rétrocompatible avec les portes existantes non configurées.
   */
  async checkZoneAccess(gateId: string, seatId: string) {
    await this.assertExists(gateId);
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      include: { row: { include: { zone: true } } },
    });
    if (!seat) {
      throw new NotFoundException('Siège introuvable');
    }
    const zone = seat.row.zone;

    const configuredAccess = await this.prisma.gateZoneAccess.findMany({ where: { gateId } });
    if (configuredAccess.length === 0) {
      return { allowed: true, zoneId: zone.id, zoneName: zone.name, restricted: false };
    }

    const allowed = configuredAccess.some((a) => a.zoneId === zone.id);
    return { allowed, zoneId: zone.id, zoneName: zone.name, restricted: true };
  }
}
