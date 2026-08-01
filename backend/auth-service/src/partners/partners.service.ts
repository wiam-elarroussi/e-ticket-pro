import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerJwtPayload } from './interfaces/partner-jwt-payload.interface';

const PARTNER_TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8h — pas de refresh token en v1 (portail en lecture seule).

/** Le hash de clé API (argon2) ne doit jamais transiter dans une réponse HTTP,
 * même vers le partenaire propriétaire ou un staff autorisé — il n'a aucune
 * utilité côté client et n'a pas à sortir de la base. */
function stripApiKeyHash<T extends { apiKeyHash?: string | null }>(partner: T): Omit<T, 'apiKeyHash'> {
  const { apiKeyHash: _apiKeyHash, ...rest } = partner;
  return rest;
}

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreatePartnerDto) {
    const partner = await this.prisma.partner.create({ data: dto });
    return stripApiKeyHash(partner);
  }

  /** Partenaires actifs uniquement — les archivés sont exclus de la liste principale. */
  async findAll() {
    const partners = await this.prisma.partner.findMany({
      where: { archivedAt: null },
      include: { salesChannels: true },
      orderBy: { createdAt: 'desc' },
    });
    return partners.map(stripApiKeyHash);
  }

  /** Espace Archives / Historique. */
  async findArchived() {
    const partners = await this.prisma.partner.findMany({
      where: { archivedAt: { not: null } },
      include: {
        salesChannels: true,
        archivedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { archivedAt: 'desc' },
    });
    return partners.map(stripApiKeyHash);
  }

  async findById(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: { salesChannels: true, quotas: true },
    });
    if (!partner) {
      throw new NotFoundException('Partenaire introuvable');
    }
    return stripApiKeyHash(partner);
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.assertExists(id);
    const partner = await this.prisma.partner.update({ where: { id }, data: dto });
    return stripApiKeyHash(partner);
  }

  /** Suspension d'un partenaire : coupe implicitement toute vente via ses canaux (cf. ChannelStatusGuard). */
  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    await this.assertExists(id);
    const partner = await this.prisma.partner.update({ where: { id }, data: { status } });
    return stripApiKeyHash(partner);
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

    const updated = await this.prisma.partner.update({
      where: { id },
      data: { archivedAt: null, archivedById: null },
    });
    return stripApiKeyHash(updated);
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

  /**
   * Émet une nouvelle clé API pour le portail partenaire (module 4) — la clé
   * en clair n'est renvoyée qu'une seule fois (comme les clés API usuelles),
   * seul son hash est conservé. Régénérer une clé invalide silencieusement
   * l'ancienne (elle ne correspond plus au hash stocké).
   */
  async generateApiKey(id: string): Promise<{ apiKey: string }> {
    await this.assertExists(id);
    const secret = crypto.randomBytes(24).toString('hex');
    const apiKey = `${id}.${secret}`;
    const apiKeyHash = await argon2.hash(secret, { type: argon2.argon2id });
    await this.prisma.partner.update({ where: { id }, data: { apiKeyHash } });
    return { apiKey };
  }

  /** Connexion au portail partenaire — clé au format "{partnerId}.{secret}". */
  async loginWithApiKey(apiKey: string): Promise<{ accessToken: string; expiresIn: number }> {
    const [partnerId, secret] = apiKey.split('.');
    if (!partnerId || !secret) {
      throw new UnauthorizedException('Clé API invalide');
    }
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner || !partner.apiKeyHash || partner.archivedAt) {
      throw new UnauthorizedException('Clé API invalide');
    }
    if (partner.status !== 'ACTIVE') {
      throw new UnauthorizedException('Ce compte partenaire est suspendu');
    }
    const valid = await argon2.verify(partner.apiKeyHash, secret).catch(() => false);
    if (!valid) {
      throw new UnauthorizedException('Clé API invalide');
    }

    const payload: Omit<PartnerJwtPayload, 'iat' | 'exp'> = {
      sub: partner.id,
      type: 'partner',
      jti: crypto.randomUUID(),
    };
    const accessToken = this.jwtService.sign(payload, {
      privateKey: Buffer.from(this.configService.getOrThrow<string>('JWT_PRIVATE_KEY'), 'base64').toString('utf8'),
      algorithm: 'RS256',
      expiresIn: PARTNER_TOKEN_TTL_SECONDS,
    });
    return { accessToken, expiresIn: PARTNER_TOKEN_TTL_SECONDS };
  }

  /** Tableau de bord du portail partenaire : profil + quotas avec consommation réelle. */
  findMyDashboard(partnerId: string) {
    return this.findById(partnerId);
  }

  private async assertExists(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partenaire introuvable');
    }
    return partner;
  }
}
