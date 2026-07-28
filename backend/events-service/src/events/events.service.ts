import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

interface DateWindow {
  startAt?: string;
  endAt?: string;
  salesOpenAt?: string;
  salesCloseAt?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, createdById: string) {
    this.assertCoherentDates(dto);
    return this.prisma.event.create({
      data: {
        name: dto.name,
        type: dto.type,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        venueId: dto.venueId,
        status: dto.status,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        salesOpenAt: dto.salesOpenAt ? new Date(dto.salesOpenAt) : undefined,
        salesCloseAt: dto.salesCloseAt ? new Date(dto.salesCloseAt) : undefined,
        maxPerOrder: dto.maxPerOrder,
        createdById,
      },
    });
  }

  findAll(venueId?: string) {
    return this.prisma.event.findMany({
      where: venueId ? { venueId } : undefined,
      orderBy: { startAt: 'asc' },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Événement introuvable');
    }
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.findById(id);
    this.assertCoherentDates({
      startAt: dto.startAt ?? existing.startAt.toISOString(),
      endAt: dto.endAt ?? existing.endAt.toISOString(),
      salesOpenAt: dto.salesOpenAt ?? existing.salesOpenAt?.toISOString(),
      salesCloseAt: dto.salesCloseAt ?? existing.salesCloseAt?.toISOString(),
    });
    return this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        venueId: dto.venueId,
        status: dto.status,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        salesOpenAt: dto.salesOpenAt ? new Date(dto.salesOpenAt) : undefined,
        salesCloseAt: dto.salesCloseAt ? new Date(dto.salesCloseAt) : undefined,
        maxPerOrder: dto.maxPerOrder,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }

  /** Cohérence des bornes temporelles : évite une programmation incohérente (ex: fenêtre de vente après le coup d'envoi). */
  private assertCoherentDates(window: DateWindow) {
    if (window.startAt && window.endAt && new Date(window.endAt) <= new Date(window.startAt)) {
      throw new BadRequestException("La date de fin doit être postérieure à la date de début");
    }
    if (
      window.salesOpenAt &&
      window.salesCloseAt &&
      new Date(window.salesCloseAt) <= new Date(window.salesOpenAt)
    ) {
      throw new BadRequestException('La fermeture des ventes doit être postérieure à leur ouverture');
    }
  }
}
