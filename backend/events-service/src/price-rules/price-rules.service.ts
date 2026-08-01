import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceRuleDto, PriceScopeDto } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { ResolvePriceQueryDto } from './dto/resolve-price.dto';

@Injectable()
export class PriceRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePriceRuleDto) {
    this.assertCoherentWindow(dto.validFrom, dto.validTo);
    this.assertScopeTarget(dto.scope, dto);

    return this.prisma.priceRule.create({
      data: {
        eventId: dto.eventId,
        categoryId: dto.categoryId,
        scope: dto.scope,
        // Seul le champ correspondant au scope choisi est conservé, même si
        // le client a envoyé d'autres cibles par erreur.
        standId: dto.scope === PriceScopeDto.STAND ? dto.standId : null,
        zoneId: dto.scope === PriceScopeDto.ZONE ? dto.zoneId : null,
        seatId: dto.scope === PriceScopeDto.SEAT ? dto.seatId : null,
        price: dto.price,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  /** Prix "à partir de" affiché au catalogue public (E-Ticket-Pay) — le plus
   * bas de toutes les règles tarifaires actives de l'événement, tous scopes
   * confondus (EVENT/STAND/ZONE/SEAT). null si aucune règle n'est configurée. */
  async findStartingPrice(eventId: string): Promise<{ price: string | null }> {
    const result = await this.prisma.priceRule.aggregate({
      where: { eventId },
      _min: { price: true },
    });
    return { price: result._min.price?.toString() ?? null };
  }

  findAll(eventId?: string) {
    return this.prisma.priceRule.findMany({
      where: eventId ? { eventId } : undefined,
      include: { category: true },
      orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.priceRule.findUnique({ where: { id }, include: { category: true } });
    if (!rule) {
      throw new NotFoundException('Règle tarifaire introuvable');
    }
    return rule;
  }

  async update(id: string, dto: UpdatePriceRuleDto) {
    const existing = await this.findById(id);
    this.assertCoherentWindow(
      dto.validFrom ?? existing.validFrom?.toISOString(),
      dto.validTo ?? existing.validTo?.toISOString(),
    );
    return this.prisma.priceRule.update({
      where: { id },
      data: {
        price: dto.price,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.priceRule.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Résout le tarif effectif en retenant la règle la plus spécifique
   * (SEAT > ZONE > STAND > EVENT) dont la fenêtre de validité couvre `at`
   * (tarification dynamique par période). À spécificité égale, la règle
   * porteuse d'une fenêtre de validité est préférée à la règle "par défaut".
   */
  async resolvePrice(query: ResolvePriceQueryDto) {
    const at = query.at ? new Date(query.at) : new Date();

    const levels: Array<{ scope: PriceScope; where?: Prisma.PriceRuleWhereInput }> = [];
    if (query.seatId) levels.push({ scope: PriceScope.SEAT, where: { seatId: query.seatId } });
    if (query.zoneId) levels.push({ scope: PriceScope.ZONE, where: { zoneId: query.zoneId } });
    if (query.standId) levels.push({ scope: PriceScope.STAND, where: { standId: query.standId } });
    levels.push({ scope: PriceScope.EVENT });

    for (const level of levels) {
      const rules = await this.prisma.priceRule.findMany({
        where: {
          eventId: query.eventId,
          categoryId: query.categoryId,
          scope: level.scope,
          ...level.where,
        },
        include: { category: true },
      });
      const active = rules.filter(
        (r) => (!r.validFrom || r.validFrom <= at) && (!r.validTo || r.validTo >= at),
      );
      if (active.length > 0) {
        const withWindow = active.find((r) => r.validFrom || r.validTo);
        return withWindow ?? active[0];
      }
    }

    throw new NotFoundException('Aucun tarif applicable pour ces critères');
  }

  private assertScopeTarget(scope: PriceScopeDto, dto: CreatePriceRuleDto) {
    if (scope === PriceScopeDto.STAND && !dto.standId) {
      throw new BadRequestException('standId requis pour une règle de portée Tribune');
    }
    if (scope === PriceScopeDto.ZONE && !dto.zoneId) {
      throw new BadRequestException('zoneId requis pour une règle de portée Zone');
    }
    if (scope === PriceScopeDto.SEAT && !dto.seatId) {
      throw new BadRequestException('seatId requis pour une règle de portée Siège');
    }
  }

  private assertCoherentWindow(validFrom?: string, validTo?: string) {
    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      throw new BadRequestException('La fin de la fenêtre de validité doit être postérieure au début');
    }
  }
}
