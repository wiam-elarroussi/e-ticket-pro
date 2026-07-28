import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';

@Injectable()
export class GatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGateDto) {
    return this.prisma.gate.create({ data: dto });
  }

  findAll(venueId?: string) {
    return this.prisma.gate.findMany({
      where: venueId ? { venueId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
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
}
