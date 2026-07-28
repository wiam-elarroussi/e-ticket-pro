import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto, createdById: string) {
    if (dto.nfcTagId) await this.assertNfcTagAvailable(dto.nfcTagId);
    return this.prisma.subscription.create({ data: { ...dto, createdById }, include: { formula: true } });
  }

  findAll(formulaId?: string) {
    return this.prisma.subscription.findMany({
      where: formulaId ? { formulaId } : undefined,
      include: { formula: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { formula: { include: { includedEvents: true } } },
    });
    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }
    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.assertExists(id);
    if (dto.nfcTagId && dto.nfcTagId !== existing.nfcTagId) {
      await this.assertNfcTagAvailable(dto.nfcTagId);
    }
    return this.prisma.subscription.update({ where: { id }, data: dto, include: { formula: true } });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.subscription.delete({ where: { id } });
    return { success: true };
  }

  /**
   * "Activation automatique de l'entrée pour les événements inclus" : un
   * abonnement actif, dans la fenêtre de validité de sa formule, et dont la
   * formule couvre l'événement demandé, donne accès sans action manuelle.
   * Utilisé par le module 6 (contrôle d'accès) lors du scan à la porte.
   */
  async checkAccess(id: string, eventId: string) {
    const subscription = await this.findById(id);

    if (subscription.status !== 'ACTIVE') {
      return { granted: false, reason: `Abonnement ${subscription.status.toLowerCase()}` };
    }

    const now = new Date();
    if (now < subscription.formula.validFrom || now > subscription.formula.validTo) {
      return { granted: false, reason: 'Hors période de validité de la formule' };
    }

    const included =
      subscription.formula.globalAccess || subscription.formula.includedEvents.some((e) => e.eventId === eventId);
    if (!included) {
      return { granted: false, reason: "Cet événement n'est pas inclus dans la formule" };
    }

    return { granted: true, reason: null, seatId: subscription.seatId };
  }

  private async assertExists(id: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }
    return subscription;
  }

  private async assertNfcTagAvailable(nfcTagId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { nfcTagId } });
    if (existing) {
      throw new ConflictException(`Identifiant NFC/RFID déjà associé à un autre abonnement : ${nfcTagId}`);
    }
  }
}
