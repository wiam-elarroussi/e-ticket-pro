import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';
import { BulkUpdateSeatStatusDto } from './dto/bulk-update-seat-status.dto';
import { PublicUpdateSeatStatusDto } from './dto/public-update-seat-status.dto';

/** Durée d'un hold panier E-Ticket-Pay : le temps de finaliser le paiement avant que le siège ne se libère. */
const SEAT_HOLD_TTL_SECONDS = 10 * 60;

@Injectable()
export class SeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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

  /**
   * Réservation temporaire (panier E-Ticket-Pay) : empêche deux visiteurs de
   * sélectionner le même siège pendant qu'ils finalisent leur achat. Pas de
   * try/catch autour de Redis ici — contrairement au flag de révocation JWT
   * (dégradation acceptable), l'anti-double-vente est le but même de cette
   * fonctionnalité : si Redis est indisponible, on préfère échouer bruyamment
   * plutôt que de vendre silencieusement le même siège deux fois.
   */
  async holdSeat(seatId: string, customerId: string) {
    const seat = await this.assertExists(seatId);
    if (seat.status !== 'AVAILABLE') {
      throw new ConflictException('Ce siège n’est plus disponible');
    }

    const key = `seat-hold:${seatId}`;
    const existingHolder = await this.redis.get(key);
    if (existingHolder && existingHolder !== customerId) {
      throw new ConflictException('Ce siège est actuellement sélectionné par un autre visiteur');
    }

    await this.redis.set(key, customerId, 'EX', SEAT_HOLD_TTL_SECONDS);
    return { seatId, heldUntil: new Date(Date.now() + SEAT_HOLD_TTL_SECONDS * 1000).toISOString() };
  }

  async releaseSeat(seatId: string, customerId: string) {
    const key = `seat-hold:${seatId}`;
    const existingHolder = await this.redis.get(key);
    if (existingHolder === customerId) {
      await this.redis.del(key);
    }
    return { success: true };
  }

  /**
   * Transition d'état déclenchée par un achat public (E-Ticket-Pay), pas par
   * un opérateur : AVAILABLE -> SOLD exige la preuve du hold (module 3 du
   * panier), SOLD -> AVAILABLE (compensation d'un panier multi-sièges dont un
   * autre siège a échoué) ne la ré-exige pas, le hold étant déjà consommé.
   */
  async publicUpdateStatus(seatId: string, dto: PublicUpdateSeatStatusDto, customerId: string) {
    const seat = await this.assertExists(seatId);

    if (dto.status === 'SOLD') {
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictException('Ce siège n’est plus disponible');
      }
      const key = `seat-hold:${seatId}`;
      const holder = await this.redis.get(key);
      if (holder !== customerId) {
        throw new ConflictException('Votre réservation sur ce siège a expiré, veuillez le resélectionner');
      }
      await this.redis.del(key);
    }

    return this.prisma.seat.update({ where: { id: seatId }, data: { status: dto.status } });
  }

  private async assertExists(id: string) {
    const seat = await this.prisma.seat.findUnique({ where: { id } });
    if (!seat) {
      throw new NotFoundException('Siège introuvable');
    }
    return seat;
  }
}
