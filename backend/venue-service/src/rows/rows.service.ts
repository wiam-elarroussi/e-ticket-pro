import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRowDto } from './dto/create-row.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { GenerateSeatsDto, NumberingDirectionDto } from './dto/generate-seats.dto';

@Injectable()
export class RowsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRowDto) {
    return this.prisma.row.create({ data: dto });
  }

  findAll(zoneId?: string) {
    return this.prisma.row.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: { _count: { select: { seats: true } } },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async update(id: string, dto: UpdateRowDto) {
    await this.assertExists(id);
    return this.prisma.row.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.row.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Génère automatiquement les sièges d'un rang selon le sens de passage
   * choisi (exigence 2.2). Refuse d'écraser des sièges existants sauf si
   * replaceExisting est explicitement demandé (protège contre une perte de
   * numérotation déjà en usage).
   */
  async generateSeats(rowId: string, dto: GenerateSeatsDto) {
    const row = await this.assertExists(rowId);
    const direction = dto.direction ?? NumberingDirectionDto.LEFT_TO_RIGHT;
    const startNumber = dto.startNumber ?? 1;

    if (dto.replaceExisting) {
      await this.prisma.seat.deleteMany({ where: { rowId } });
    } else {
      const existingCount = await this.prisma.seat.count({ where: { rowId } });
      if (existingCount > 0) {
        throw new ConflictException(
          'Ce rang contient déjà des sièges. Utilisez replaceExisting pour régénérer.',
        );
      }
    }

    const seatsData = Array.from({ length: dto.count }, (_, i) => {
      const number =
        direction === NumberingDirectionDto.RIGHT_TO_LEFT
          ? startNumber + (dto.count - 1 - i)
          : startNumber + i;
      return {
        rowId,
        number,
        label: `${row.label}-${number}`,
        // Position physique toujours de gauche à droite : seul le SENS de la
        // numérotation change, pas l'ordre spatial d'affichage sur le plan.
        // y espacé selon l'ordre du rang pour que les rangs ne se superposent
        // pas par défaut dans l'éditeur visuel (ajustable ensuite au glisser-déposer).
        x: i * 30,
        y: row.orderIndex * 40,
      };
    });

    await this.prisma.$transaction([
      this.prisma.seat.createMany({ data: seatsData }),
      this.prisma.row.update({ where: { id: rowId }, data: { numberingDirection: direction } }),
    ]);

    return this.prisma.seat.findMany({ where: { rowId }, orderBy: { number: 'asc' } });
  }

  private async assertExists(id: string) {
    const row = await this.prisma.row.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Rang introuvable');
    }
    return row;
  }
}
