import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionFormulaDto } from './dto/create-subscription-formula.dto';
import { UpdateSubscriptionFormulaDto } from './dto/update-subscription-formula.dto';
import { SetFormulaEventsDto } from './dto/set-formula-events.dto';

@Injectable()
export class SubscriptionFormulasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionFormulaDto) {
    this.assertCoherentWindow(dto.validFrom, dto.validTo);
    return this.prisma.subscriptionFormula.create({
      data: {
        name: dto.name,
        type: dto.type,
        venueId: dto.venueId,
        price: dto.price,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        includedEvents: dto.eventIds
          ? { createMany: { data: dto.eventIds.map((eventId) => ({ eventId })) } }
          : undefined,
      },
      include: { includedEvents: true, _count: { select: { subscriptions: true } } },
    });
  }

  findAll(venueId?: string) {
    return this.prisma.subscriptionFormula.findMany({
      where: venueId ? { venueId } : undefined,
      include: { includedEvents: { include: { event: true } }, _count: { select: { subscriptions: true } } },
      orderBy: { validFrom: 'desc' },
    });
  }

  async findById(id: string) {
    const formula = await this.prisma.subscriptionFormula.findUnique({
      where: { id },
      include: { includedEvents: { include: { event: true } }, _count: { select: { subscriptions: true } } },
    });
    if (!formula) {
      throw new NotFoundException('Formule d’abonnement introuvable');
    }
    return formula;
  }

  async update(id: string, dto: UpdateSubscriptionFormulaDto) {
    const existing = await this.findById(id);
    this.assertCoherentWindow(
      dto.validFrom ?? existing.validFrom.toISOString(),
      dto.validTo ?? existing.validTo.toISOString(),
    );
    return this.prisma.subscriptionFormula.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  /** Remplace intégralement la liste des événements couverts par la formule. */
  async setIncludedEvents(id: string, dto: SetFormulaEventsDto) {
    await this.findById(id);
    await this.prisma.$transaction([
      this.prisma.subscriptionFormulaEvent.deleteMany({ where: { formulaId: id } }),
      this.prisma.subscriptionFormulaEvent.createMany({
        data: dto.eventIds.map((eventId) => ({ formulaId: id, eventId })),
      }),
    ]);
    return this.prisma.subscriptionFormulaEvent.findMany({ where: { formulaId: id }, include: { event: true } });
  }

  async remove(id: string) {
    const formula = await this.findById(id);
    if (formula._count.subscriptions > 0) {
      throw new ConflictException(
        'Impossible de supprimer une formule pour laquelle des cartes abonnés ont déjà été émises',
      );
    }
    await this.prisma.subscriptionFormula.delete({ where: { id } });
    return { success: true };
  }

  private assertCoherentWindow(validFrom: string, validTo: string) {
    if (new Date(validTo) <= new Date(validFrom)) {
      throw new BadRequestException('La fin de validité doit être postérieure au début');
    }
  }
}
