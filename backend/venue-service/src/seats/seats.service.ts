import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';
import { BulkUpdateSeatStatusDto } from './dto/bulk-update-seat-status.dto';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSeatDto) {
    const existing = await this.prisma.seat.findUnique({
      where: { rowId_number: { rowId: dto.rowId, number: dto.number } },
    });
    if (existing) {
      throw new ConflictException('Un siège avec ce numéro existe déjà dans ce rang');
    }
    return this.prisma.seat.create({ data: dto });
  }

  findAll(rowId?: string) {
    return this.prisma.seat.findMany({
      where: rowId ? { rowId } : undefined,
      orderBy: { number: 'asc' },
    });
  }

  findById(id: string) {
    return this.assertExists(id);
  }

  async update(id: string, dto: UpdateSeatDto) {
    await this.assertExists(id);
    return this.prisma.seat.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, dto: UpdateSeatStatusDto) {
    await this.assertExists(id);
    return this.prisma.seat.update({ where: { id }, data: { status: dto.status } });
  }

  /**
   * Action groupée : évite de cliquer siège par siège (ex: 24 sièges d'un
   * rang endommagé à passer en Hors-service en un seul geste).
   */
  async bulkUpdateStatus(dto: BulkUpdateSeatStatusDto) {
    const result = await this.prisma.seat.updateMany({
      where: { id: { in: dto.seatIds } },
      data: { status: dto.status },
    });
    return { updatedCount: result.count };
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.seat.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const seat = await this.prisma.seat.findUnique({ where: { id } });
    if (!seat) {
      throw new NotFoundException('Siège introuvable');
    }
    return seat;
  }
}
