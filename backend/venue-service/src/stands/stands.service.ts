import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStandDto } from './dto/create-stand.dto';
import { UpdateStandDto } from './dto/update-stand.dto';

@Injectable()
export class StandsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStandDto) {
    return this.prisma.stand.create({ data: dto });
  }

  findAll(venueId?: string) {
    return this.prisma.stand.findMany({
      where: venueId ? { venueId } : undefined,
      include: { _count: { select: { zones: true } } },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findById(id: string) {
    const stand = await this.prisma.stand.findUnique({
      where: { id },
      include: { zones: true },
    });
    if (!stand) {
      throw new NotFoundException('Tribune introuvable');
    }
    return stand;
  }

  async update(id: string, dto: UpdateStandDto) {
    await this.assertExists(id);
    return this.prisma.stand.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.stand.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const stand = await this.prisma.stand.findUnique({ where: { id } });
    if (!stand) {
      throw new NotFoundException('Tribune introuvable');
    }
    return stand;
  }
}
