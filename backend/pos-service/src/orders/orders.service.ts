import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesClient } from '../integrations/services-client';
import { CreateOrderDto, OrderItemInputDto } from './dto/create-order.dto';

interface SalesQuota {
  scope: 'EVENT' | 'STAND' | 'ZONE' | 'CHANNEL';
  standId: string | null;
  zoneId: string | null;
  channelId: string | null;
  categoryId: string | null;
  maxQuantity: number | null;
  isBlocked: boolean;
}

interface ResolvedItem extends OrderItemInputDto {
  unitPrice: number;
  seatLabel: string | null;
  seatNumber: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesClient,
  ) {}

  /**
   * Vente "3 clics" : valide chaque ligne du panier (siège disponible,
   * jauge non bloquée/non atteinte, tarif résolu), puis applique les effets
   * de bord externes (siège -> Vendu, génération du billet sécurisé) avant
   * de persister la commande. En cas d'échec en cours de route, les sièges
   * déjà marqués vendus sont remis Disponible (compensation best-effort —
   * pas de transaction distribuée entre microservices).
   */
  async checkout(dto: CreateOrderDto, token: string, operatorId: string) {
    const eventRes = await this.services.getEvent(token, dto.eventId);
    if (eventRes.status !== 200) {
      throw new BadRequestException('Événement introuvable ou inaccessible');
    }
    const event = eventRes.data;
    if (event.status !== 'PUBLISHED') {
      throw new ConflictException("Cet événement n'est pas ouvert à la vente");
    }
    if (event.maxPerOrder && dto.items.length > event.maxPerOrder) {
      throw new BadRequestException(`Maximum ${event.maxPerOrder} billet(s) par panier pour cet événement`);
    }

    const quotasRes = await this.services.listSalesQuotas(token, dto.eventId);
    const quotas: SalesQuota[] = quotasRes.status === 200 ? quotasRes.data : [];

    const resolvedItems: ResolvedItem[] = [];
    for (const item of dto.items) {
      const seatRes = await this.services.getSeat(token, item.seatId);
      if (seatRes.status !== 200) {
        throw new BadRequestException(`Siège introuvable : ${item.seatId}`);
      }
      if (seatRes.data.status !== 'AVAILABLE') {
        throw new ConflictException(`Le siège ${seatRes.data.label ?? seatRes.data.number} n'est plus disponible`);
      }

      const applicableQuotas = quotas.filter((q) => {
        if (q.categoryId && q.categoryId !== item.categoryId) return false;
        if (q.scope === 'EVENT') return true;
        if (q.scope === 'STAND') return q.standId === item.standId;
        if (q.scope === 'ZONE') return q.zoneId === item.zoneId;
        if (q.scope === 'CHANNEL') return q.channelId === dto.channelId;
        return false;
      });

      const blocked = applicableQuotas.find((q) => q.isBlocked);
      if (blocked) {
        throw new ConflictException('La vente est actuellement bloquée pour ce siège ou cette catégorie');
      }
      for (const quota of applicableQuotas) {
        if (quota.maxQuantity == null) continue;
        const sold = await this.countSoldForQuota(dto.eventId, dto.channelId, quota);
        if (sold >= quota.maxQuantity) {
          throw new ConflictException('Jauge de vente atteinte pour ce siège ou cette catégorie');
        }
      }

      const priceRes = await this.services.resolvePrice(token, {
        eventId: dto.eventId,
        categoryId: item.categoryId,
        standId: item.standId,
        zoneId: item.zoneId,
        seatId: item.seatId,
      });
      if (priceRes.status !== 200) {
        throw new BadRequestException(`Aucun tarif applicable pour le siège ${item.seatId}`);
      }

      resolvedItems.push({
        ...item,
        unitPrice: Number(priceRes.data.price),
        seatLabel: seatRes.data.label,
        seatNumber: seatRes.data.number,
      });
    }

    const soldSeatIds: string[] = [];
    const finalItems: Array<ResolvedItem & { ticketId: string }> = [];
    try {
      for (const item of resolvedItems) {
        const statusRes = await this.services.setSeatStatus(token, item.seatId, 'SOLD');
        if (statusRes.status !== 200) {
          throw new ConflictException(`Impossible de marquer le siège ${item.seatId} comme vendu`);
        }
        soldSeatIds.push(item.seatId);

        const ticketRes = await this.services.generateTicket(token, {
          templateId: dto.templateId,
          eventId: dto.eventId,
          dataSnapshot: {
            event: {
              id: dto.eventId,
              name: event.name,
              startAt: event.startAt,
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
            },
            seat: { id: item.seatId, label: item.seatLabel ?? `Siège ${item.seatNumber}`, number: item.seatNumber },
            buyer: { fullName: dto.buyerName, email: dto.buyerEmail, phone: dto.buyerPhone },
          },
        });
        if (ticketRes.status !== 201) {
          throw new BadGatewayException('Échec de la génération du billet');
        }
        finalItems.push({ ...item, ticketId: ticketRes.data.id });
      }
    } catch (err) {
      await Promise.allSettled(soldSeatIds.map((id) => this.services.setSeatStatus(token, id, 'AVAILABLE')));
      throw err;
    }

    const totalAmount = finalItems.reduce((sum, i) => sum + i.unitPrice, 0);

    return this.prisma.order.create({
      data: {
        eventId: dto.eventId,
        venueId: dto.venueId,
        channelId: dto.channelId,
        operatorId,
        paymentMethod: dto.paymentMethod,
        totalAmount,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        buyerPhone: dto.buyerPhone,
        items: {
          create: finalItems.map((i) => ({
            eventId: dto.eventId,
            seatId: i.seatId,
            standId: i.standId,
            zoneId: i.zoneId,
            categoryId: i.categoryId,
            ticketId: i.ticketId,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  findAll(eventId?: string, channelId?: string) {
    return this.prisma.order.findMany({
      where: {
        eventId: eventId || undefined,
        channelId: channelId || undefined,
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }
    return order;
  }

  private async countSoldForQuota(eventId: string, channelId: string, quota: SalesQuota) {
    const where: Prisma.OrderItemWhereInput = {
      eventId,
      order: { status: 'COMPLETED' },
    };
    if (quota.categoryId) where.categoryId = quota.categoryId;
    if (quota.scope === 'STAND') where.standId = quota.standId as string;
    if (quota.scope === 'ZONE') where.zoneId = quota.zoneId as string;
    if (quota.scope === 'CHANNEL') where.order = { status: 'COMPLETED', channelId };
    return this.prisma.orderItem.count({ where });
  }
}
