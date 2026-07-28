import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { UpdateZonePolygonDto } from './dto/update-zone-polygon.dto';
import { SetZoneGateAccessDto } from './dto/set-zone-gate-access.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateZoneDto) {
    return this.prisma.zone.create({ data: dto });
  }

  findAll(standId?: string) {
    return this.prisma.zone.findMany({
      where: standId ? { standId } : undefined,
      include: { _count: { select: { rows: true } }, gateAccess: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        rows: { orderBy: { orderIndex: 'asc' }, include: { seats: { orderBy: { number: 'asc' } } } },
        gateAccess: { include: { gate: true } },
      },
    });
    if (!zone) {
      throw new NotFoundException('Zone introuvable');
    }
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.assertExists(id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  /** Contour dessiné à la souris dans l'éditeur de plan 2D. */
  async updatePolygon(id: string, dto: UpdateZonePolygonDto) {
    await this.assertExists(id);
    const points = dto.points.map((p) => ({ x: p.x, y: p.y }));
    return this.prisma.zone.update({ where: { id }, data: { mapPolygon: points } });
  }

  /** Remplace intégralement la liste des portes donnant accès à cette zone. */
  async setGateAccess(id: string, dto: SetZoneGateAccessDto) {
    await this.assertExists(id);
    await this.prisma.$transaction([
      this.prisma.gateZoneAccess.deleteMany({ where: { zoneId: id } }),
      this.prisma.gateZoneAccess.createMany({
        data: dto.gateIds.map((gateId) => ({ gateId, zoneId: id })),
      }),
    ]);
    return this.prisma.gateZoneAccess.findMany({ where: { zoneId: id }, include: { gate: true } });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.zone.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException('Zone introuvable');
    }
    return zone;
  }
}
