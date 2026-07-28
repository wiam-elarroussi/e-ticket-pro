import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto';
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto';

/** Convertit "HH:mm" en Date exploitable par une colonne Prisma @db.Time(). */
function toTimeDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

@Injectable()
export class SalesChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSalesChannelDto) {
    return this.prisma.salesChannel.create({
      data: {
        partnerId: dto.partnerId,
        name: dto.name,
        type: dto.type,
        salesWindowStart: toTimeDate(dto.salesWindowStart),
        salesWindowEnd: toTimeDate(dto.salesWindowEnd),
      },
    });
  }

  findAll(partnerId?: string) {
    return this.prisma.salesChannel.findMany({
      where: partnerId ? { partnerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const channel = await this.prisma.salesChannel.findUnique({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Canal de vente introuvable');
    }
    return channel;
  }

  async update(id: string, dto: UpdateSalesChannelDto) {
    await this.findById(id);
    return this.prisma.salesChannel.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        salesWindowStart: toTimeDate(dto.salesWindowStart),
        salesWindowEnd: toTimeDate(dto.salesWindowEnd),
      },
    });
  }

  /** Kill-switch d'urgence (1.3) : coupe/rouvre un canal de vente en un appel. */
  async setActive(id: string, isActive: boolean) {
    await this.findById(id);
    return this.prisma.salesChannel.update({ where: { id }, data: { isActive } });
  }
}
