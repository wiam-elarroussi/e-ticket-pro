import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePartnerDto) {
    return this.prisma.partner.create({ data: dto });
  }

  /** Partenaires actifs uniquement — les archivés sont exclus de la liste principale. */
  findAll() {
    return this.prisma.partner.findMany({
      where: { archivedAt: null },
      include: { salesChannels: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Espace Archives / Historique. */
  findArchived() {
    return this.prisma.partner.findMany({
      where: { archivedAt: { not: null } },
      include: {
        salesChannels: true,
        archivedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { archivedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: { salesChannels: true, quotas: true },
    });
    if (!partner) {
      throw new NotFoundException('Partenaire introuvable');
    }
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.assertExists(id);
    return this.prisma.partner.update({ where: { id }, data: dto });
  }

  /** Suspension d'un partenaire : coupe implicitement toute vente via ses canaux (cf. ChannelStatusGuard). */
  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    await this.assertExists(id);
    return this.prisma.partner.update({ where: { id }, data: { status } });
  }

  /**
   * Archivage (soft delete) : masque le partenaire de la liste active et
   * coupe automatiquement l'accès API et les canaux de vente, sans détruire
   * l'historique (quotas/ventes) — requis pour la traçabilité comptable.
   */
  async archive(id: string, actingUserId: string) {
    const partner = await this.assertExists(id);
    if (partner.archivedAt) {
      throw new ConflictException('Ce partenaire est déjà archivé');
    }

    await this.prisma.$transaction([
      this.prisma.salesChannel.updateMany({ where: { partnerId: id }, data: { isActive: false } }),
      this.prisma.partner.update({
        where: { id },
        data: { archivedAt: new Date(), archivedById: actingUserId, status: 'SUSPENDED' },
      }),
    ]);

    return this.findById(id);
  }

  /**
   * Réintègre un partenaire archivé dans la liste active. Les canaux de vente
   * restent volontairement désactivés (choix conservateur) : leur réactivation
   * doit être un geste explicite et distinct, pas un effet de bord du restore.
   */
  async restore(id: string) {
    const partner = await this.assertExists(id);
    if (!partner.archivedAt) {
      throw new ConflictException("Ce partenaire n'est pas archivé");
    }

    return this.prisma.partner.update({
      where: { id },
      data: { archivedAt: null, archivedById: null },
    });
  }

  /**
   * Suppression définitive (hard delete) : réservée aux partenaires déjà
   * archivés, et bloquée si le moindre historique de ventes (quotas avec
   * soldQuantity > 0) ou de transactions (sessions d'accès via ses canaux)
   * existe encore — préserve la conformité des rapports d'audit du stade.
   */
  async hardDelete(id: string) {
    const partner = await this.assertExists(id);

    if (!partner.archivedAt) {
      throw new ForbiddenException('Seul un partenaire archivé peut être supprimé définitivement');
    }

    const [soldAggregate, sessionCount] = await Promise.all([
      this.prisma.partnerQuota.aggregate({ where: { partnerId: id }, _sum: { soldQuantity: true } }),
      this.prisma.session.count({ where: { salesChannel: { partnerId: id } } }),
    ]);

    const totalSold = soldAggregate._sum.soldQuantity ?? 0;
    if (totalSold > 0 || sessionCount > 0) {
      throw new ConflictException(
        'Suppression impossible : ce partenaire possède un historique de billets vendus ou de transactions. ' +
          'Conservez-le archivé pour préserver la conformité des rapports d’audit.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.salesChannel.deleteMany({ where: { partnerId: id } }),
      this.prisma.partner.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  private async assertExists(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partenaire introuvable');
    }
    return partner;
  }
}
