import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVenueDto, createdById: string) {
    return this.prisma.venue.create({ data: { ...dto, createdById } });
  }

  findAll() {
    return this.prisma.venue.findMany({
      include: { _count: { select: { stands: true, gates: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { gates: true, stands: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!venue) {
      throw new NotFoundException('Enceinte introuvable');
    }
    return venue;
  }

  /** Arborescence complète (stands → zones → rangs → sièges) pour l'éditeur de plan 2D. */
  async findFullTree(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        gates: { include: { zoneAccess: true } },
        stands: {
          orderBy: { orderIndex: 'asc' },
          include: {
            zones: {
              include: {
                rows: {
                  orderBy: { orderIndex: 'asc' },
                  include: { seats: { orderBy: { number: 'asc' } } },
                },
                gateAccess: true,
              },
            },
          },
        },
      },
    });
    if (!venue) {
      throw new NotFoundException('Enceinte introuvable');
    }
    return venue;
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.assertExists(id);
    return this.prisma.venue.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.venue.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) {
      throw new NotFoundException('Enceinte introuvable');
    }
    return venue;
  }
}
