import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesQuotaDto, QuotaScopeDto } from './dto/create-sales-quota.dto';
import { UpdateSalesQuotaDto } from './dto/update-sales-quota.dto';
import { SetQuotaStatusDto } from './dto/set-quota-status.dto';

@Injectable()
export class SalesQuotasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSalesQuotaDto) {
    this.assertScopeTarget(dto);
    return this.prisma.salesQuota.create({
      data: {
        eventId: dto.eventId,
        scope: dto.scope,
        standId: dto.scope === QuotaScopeDto.STAND ? dto.standId : null,
        zoneId: dto.scope === QuotaScopeDto.ZONE ? dto.zoneId : null,
        channelId: dto.scope === QuotaScopeDto.CHANNEL ? dto.channelId : null,
        categoryId: dto.categoryId,
        maxQuantity: dto.maxQuantity,
        isBlocked: dto.isBlocked ?? false,
      },
      include: { category: true },
    });
  }

  findAll(eventId?: string) {
    return this.prisma.salesQuota.findMany({
      where: eventId ? { eventId } : undefined,
      include: { category: true },
      orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const quota = await this.prisma.salesQuota.findUnique({ where: { id }, include: { category: true } });
    if (!quota) {
      throw new NotFoundException('Jauge de vente introuvable');
    }
    return quota;
  }

  async update(id: string, dto: UpdateSalesQuotaDto) {
    await this.findById(id);
    return this.prisma.salesQuota.update({ where: { id }, data: { maxQuantity: dto.maxQuantity } });
  }

  /** Activation/blocage instantané, indépendant du droit de configuration complet. */
  async setStatus(id: string, dto: SetQuotaStatusDto) {
    await this.findById(id);
    return this.prisma.salesQuota.update({ where: { id }, data: { isBlocked: dto.isBlocked } });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.salesQuota.delete({ where: { id } });
    return { success: true };
  }

  private assertScopeTarget(dto: CreateSalesQuotaDto) {
    if (dto.scope === QuotaScopeDto.STAND && !dto.standId) {
      throw new BadRequestException('standId requis pour une jauge de portée Tribune');
    }
    if (dto.scope === QuotaScopeDto.ZONE && !dto.zoneId) {
      throw new BadRequestException('zoneId requis pour une jauge de portée Zone');
    }
    if (dto.scope === QuotaScopeDto.CHANNEL && !dto.channelId) {
      throw new BadRequestException('channelId requis pour une jauge de portée Canal de vente');
    }
  }
}
