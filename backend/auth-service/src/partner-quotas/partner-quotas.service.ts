import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerQuotaDto } from './dto/create-partner-quota.dto';
import { UpdatePartnerQuotaDto } from './dto/update-partner-quota.dto';

@Injectable()
export class PartnerQuotasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePartnerQuotaDto) {
    return this.prisma.partnerQuota.create({
      data: {
        partnerId: dto.partnerId,
        salesChannelId: dto.salesChannelId,
        eventId: dto.eventId,
        ticketCategoryId: dto.ticketCategoryId,
        maxQuantity: dto.maxQuantity,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      },
    });
  }

  findAll(partnerId?: string) {
    return this.prisma.partnerQuota.findMany({
      where: partnerId ? { partnerId } : undefined,
    });
  }

  async findById(id: string) {
    const quota = await this.prisma.partnerQuota.findUnique({ where: { id } });
    if (!quota) {
      throw new NotFoundException('Quota introuvable');
    }
    return quota;
  }

  async update(id: string, dto: UpdatePartnerQuotaDto) {
    await this.findById(id);
    return this.prisma.partnerQuota.update({
      where: { id },
      data: {
        maxQuantity: dto.maxQuantity,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.partnerQuota.delete({ where: { id } });
    return { success: true };
  }
}
