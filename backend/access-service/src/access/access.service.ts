import { BadRequestException, Injectable } from '@nestjs/common';
import { ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesClient } from '../integrations/services-client';
import { ScanDto } from './dto/scan.dto';

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesClient,
  ) {}

  /**
   * Moteur de validation unifié (module 6.1) : un scan est soit un billet
   * (code + checksum Mode 4, vérifié par tickets-service), soit un
   * abonnement (droit d'entrée résolu par events-service, module 3.3).
   * Toujours 3 issues possibles : Valide / Déjà scanné / Invalide — plus
   * Annulé (liste noire) et Mauvais événement comme cas particuliers
   * d'Invalide, et Outrepassé si un opérateur habilité force l'entrée.
   */
  async scan(dto: ScanDto, token: string, scannedById: string, canOverride: boolean) {
    if (!dto.code && !dto.subscriptionId) {
      throw new BadRequestException('code ou subscriptionId requis');
    }
    if (dto.code && dto.subscriptionId) {
      throw new BadRequestException('Fournir soit code soit subscriptionId, pas les deux');
    }

    return dto.code
      ? this.scanTicket(dto, token, scannedById, canOverride)
      : this.scanSubscription(dto, token, scannedById, canOverride);
  }

  private async scanTicket(dto: ScanDto, token: string, scannedById: string, canOverride: boolean) {
    const verifyRes = await this.services.verifyTicketCode(token, dto.code as string);
    const verify = verifyRes.data;

    let result: ScanResult;
    let reason: string | null = null;
    let ticketId: string | null = null;

    if (!verify?.checksumValid) {
      result = 'INVALID';
      reason = 'Code invalide (échec du checksum)';
    } else if (!verify.exists || !verify.ticket) {
      result = 'INVALID';
      reason = 'Billet introuvable';
    } else {
      ticketId = verify.ticket.id;
      if (verify.ticket.status === 'CANCELLED') {
        result = 'CANCELLED';
        reason = 'Billet annulé (liste noire)';
      } else if (verify.ticket.eventId && verify.ticket.eventId !== dto.eventId) {
        result = 'WRONG_EVENT';
        reason = "Ce billet ne correspond pas à l'événement de cette porte";
      } else {
        const duplicate = await this.findPriorValidScan(dto.eventId, 'ticketId', ticketId);
        if (duplicate) {
          result = 'ALREADY_SCANNED';
          reason = `Déjà scanné le ${duplicate.scannedAt.toISOString()}`;
        } else {
          result = 'VALID';
        }
      }
    }

    const finalResult = this.applyOverride(result, dto.force, canOverride);
    const log = await this.prisma.accessLog.create({
      data: {
        eventId: dto.eventId,
        gateId: dto.gateId,
        scanType: 'TICKET',
        ticketId,
        rawCode: dto.code,
        result: finalResult,
        reason,
        scannedById,
      },
    });

    return {
      granted: finalResult === 'VALID' || finalResult === 'OVERRIDDEN',
      result: finalResult,
      reason,
      ticket: verify?.ticket ?? null,
      log,
    };
  }

  private async scanSubscription(dto: ScanDto, token: string, scannedById: string, canOverride: boolean) {
    const accessRes = await this.services.checkSubscriptionAccess(token, dto.subscriptionId as string, dto.eventId);
    const access = accessRes.data;

    let result: ScanResult;
    let reason: string | null = access?.reason ?? null;

    if (!access?.granted) {
      result = 'INVALID';
    } else {
      const duplicate = await this.findPriorValidScan(dto.eventId, 'subscriptionId', dto.subscriptionId as string);
      if (duplicate) {
        result = 'ALREADY_SCANNED';
        reason = `Déjà scanné le ${duplicate.scannedAt.toISOString()}`;
      } else {
        result = 'VALID';
      }
    }

    const finalResult = this.applyOverride(result, dto.force, canOverride);
    const log = await this.prisma.accessLog.create({
      data: {
        eventId: dto.eventId,
        gateId: dto.gateId,
        scanType: 'SUBSCRIPTION',
        subscriptionId: dto.subscriptionId,
        result: finalResult,
        reason,
        scannedById,
      },
    });

    return {
      granted: finalResult === 'VALID' || finalResult === 'OVERRIDDEN',
      result: finalResult,
      reason,
      seatId: access?.seatId ?? null,
      log,
    };
  }

  findLogs(eventId?: string, gateId?: string) {
    return this.prisma.accessLog.findMany({
      where: { eventId: eventId || undefined, gateId: gateId || undefined },
      orderBy: { scannedAt: 'desc' },
      take: 200,
    });
  }

  /** Liste blanche (billets actifs) / liste noire (annulés) pour un événement — export en masse (module 6.2/6.3), destiné au caching hors-ligne d'un poste de contrôle. */
  async syncPackage(token: string, eventId: string) {
    const ticketsRes = await this.services.listTicketsForEvent(token, eventId);
    const tickets = ticketsRes.status === 200 ? ticketsRes.data : [];
    return {
      eventId,
      generatedAt: new Date().toISOString(),
      whitelist: tickets.filter((t) => t.status === 'ACTIVE').map((t) => ({ id: t.id, code: t.code, checksum: t.checksum })),
      blacklist: tickets.filter((t) => t.status === 'CANCELLED').map((t) => t.id),
    };
  }

  private applyOverride(result: ScanResult, force: boolean | undefined, canOverride: boolean): ScanResult {
    if (result === 'VALID') return result;
    return force && canOverride ? 'OVERRIDDEN' : result;
  }

  private findPriorValidScan(eventId: string, field: 'ticketId' | 'subscriptionId', value: string) {
    return this.prisma.accessLog.findFirst({
      where: { eventId, [field]: value, result: { in: ['VALID', 'OVERRIDDEN'] } },
      orderBy: { scannedAt: 'desc' },
    });
  }
}
