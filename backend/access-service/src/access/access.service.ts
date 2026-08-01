import { BadRequestException, Injectable } from '@nestjs/common';
import { ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesClient } from '../integrations/services-client';
import { ScanDto } from './dto/scan.dto';

/** Le siège n'est présent que pour les billets nominatifs assis (dataSnapshot.seat.id,
 * cf. pos-service#publicCheckout et le flux staff équivalent) ; absent = pas de contrôle
 * zone/porte pour ce billet (ex: billet debout/general admission). */
function extractSeatId(dataSnapshot: Record<string, unknown> | null | undefined): string | null {
  const seat = (dataSnapshot as { seat?: { id?: unknown } } | undefined)?.seat;
  return typeof seat?.id === 'string' ? seat.id : null;
}

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
    const inputCount = [dto.code, dto.nfcTagId, dto.subscriptionId].filter(Boolean).length;
    if (inputCount === 0) {
      throw new BadRequestException('code, nfcTagId ou subscriptionId requis');
    }
    if (inputCount > 1) {
      throw new BadRequestException('Fournir un seul de code / nfcTagId / subscriptionId, pas plusieurs');
    }

    if (dto.nfcTagId) return this.scanTicketByNfc(dto, token, scannedById, canOverride);
    return dto.code
      ? this.scanTicket(dto, token, scannedById, canOverride)
      : this.scanSubscription(dto, token, scannedById, canOverride);
  }

  private async scanTicket(dto: ScanDto, token: string, scannedById: string, canOverride: boolean) {
    const startedAt = Date.now();
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

    if (result === 'VALID') {
      const zoneCheck = await this.enforceZoneAccess(token, dto.gateId, extractSeatId(verify?.ticket?.dataSnapshot));
      if (zoneCheck) {
        result = 'INVALID';
        reason = zoneCheck;
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
        latencyMs: Date.now() - startedAt,
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

  /**
   * Scan sans contact (bracelet/carte NFC) — pas de checksum comme pour un
   * code imprimé : l'unicité du tag physique (garantie à la création du
   * billet) fait office de preuve d'intégrité.
   */
  private async scanTicketByNfc(dto: ScanDto, token: string, scannedById: string, canOverride: boolean) {
    const startedAt = Date.now();
    const verifyRes = await this.services.verifyTicketNfc(token, dto.nfcTagId as string);
    const verify = verifyRes.data;

    let result: ScanResult;
    let reason: string | null = null;
    let ticketId: string | null = null;

    if (!verify?.exists || !verify.ticket) {
      result = 'INVALID';
      reason = 'Aucun billet associé à ce tag NFC';
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

    if (result === 'VALID') {
      const zoneCheck = await this.enforceZoneAccess(token, dto.gateId, extractSeatId(verify?.ticket?.dataSnapshot));
      if (zoneCheck) {
        result = 'INVALID';
        reason = zoneCheck;
      }
    }

    const finalResult = this.applyOverride(result, dto.force, canOverride);
    const log = await this.prisma.accessLog.create({
      data: {
        eventId: dto.eventId,
        gateId: dto.gateId,
        scanType: 'TICKET',
        ticketId,
        rawCode: dto.nfcTagId,
        result: finalResult,
        reason,
        scannedById,
        latencyMs: Date.now() - startedAt,
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
    const startedAt = Date.now();
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

    if (result === 'VALID' && access?.seatId) {
      const zoneCheck = await this.enforceZoneAccess(token, dto.gateId, access.seatId);
      if (zoneCheck) {
        result = 'INVALID';
        reason = zoneCheck;
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
        latencyMs: Date.now() - startedAt,
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

  /**
   * Liste blanche (billets actifs) / liste noire (annulés) pour un événement —
   * export en masse (module 6.2/6.3, lettre de conformité §3 "Continuité de
   * Service"), consommé par le poste de contrôle pour valider les billets en
   * toute autonomie (localStorage côté frontend) en cas de coupure réseau.
   */
  async syncPackage(token: string, eventId: string) {
    const ticketsRes = await this.services.listTicketsForEvent(token, eventId);
    const tickets = ticketsRes.status === 200 ? ticketsRes.data : [];
    return {
      eventId,
      generatedAt: new Date().toISOString(),
      whitelist: tickets
        .filter((t) => t.status === 'ACTIVE')
        .map((t) => ({ id: t.id, code: t.code, checksum: t.checksum, nfcTagId: t.nfcTagId })),
      blacklist: tickets
        .filter((t) => t.status === 'CANCELLED')
        .map((t) => ({ id: t.id, code: t.code, nfcTagId: t.nfcTagId })),
    };
  }

  /**
   * Retourne un motif de refus si la porte scannée ne dessert pas la zone du
   * siège (contrôle d'accréditation, module 6 — cf. gates.service.ts). null
   * si aucun siège à vérifier ou si l'accès est autorisé. Une porte sans
   * configuration de zones reste ouverte (rétrocompatibilité).
   */
  private async enforceZoneAccess(token: string, gateId: string, seatId: string | null): Promise<string | null> {
    if (!seatId) return null;
    const res = await this.services.checkGateZoneAccess(token, gateId, seatId);
    if (res.status !== 200 || !res.data) return null;
    if (res.data.restricted && !res.data.allowed) {
      return `Cette porte ne dessert pas la zone "${res.data.zoneName}" de ce billet (contrôle d'accréditation)`;
    }
    return null;
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
