import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateSecureCode, verifySecureCode } from '../common/security/secure-code.util';
import { renderCodeImage, CodeImageType } from '../common/security/code-image.util';
import { ServicesClient } from '../integrations/services-client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ImportTicketsDto } from './dto/import-tickets.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicesClient: ServicesClient,
  ) {}

  async create(dto: CreateTicketDto, createdById: string, token: string) {
    await this.assertTemplateExists(dto.templateId);
    if (dto.nfcTagId) await this.assertNfcTagAvailable(dto.nfcTagId);
    if (dto.seatId) await this.assertSeatAvailable(dto.seatId, token);

    const { code, checksum } = generateSecureCode();
    const ticket = await this.prisma.generatedTicket.create({
      data: {
        templateId: dto.templateId,
        eventId: dto.eventId,
        code,
        checksum,
        nfcTagId: dto.nfcTagId,
        dataSnapshot: dto.dataSnapshot as unknown as Prisma.InputJsonValue,
        createdById,
      },
    });

    // Marque le siège comme Vendu une fois le billet réellement créé, pour éviter
    // qu'un second billet ne soit généré sur le même siège nominatif.
    if (dto.seatId) await this.servicesClient.setSeatStatus(token, dto.seatId, 'SOLD');

    return ticket;
  }

  /** Génération en masse — un code sécurisé propre à chaque entrée. */
  async importBulk(dto: ImportTicketsDto, createdById: string) {
    await this.assertTemplateExists(dto.templateId);
    const nfcTagIds = dto.entries.map((e) => e.nfcTagId).filter((id): id is string => !!id);
    const duplicateInBatch = nfcTagIds.find((id, i) => nfcTagIds.indexOf(id) !== i);
    if (duplicateInBatch) {
      throw new ConflictException(`Identifiant NFC/RFID en double dans le lot : ${duplicateInBatch}`);
    }
    for (const nfcTagId of nfcTagIds) {
      await this.assertNfcTagAvailable(nfcTagId);
    }
    const created = await this.prisma.$transaction(
      dto.entries.map((entry) => {
        const { code, checksum } = generateSecureCode();
        return this.prisma.generatedTicket.create({
          data: {
            templateId: dto.templateId,
            eventId: dto.eventId,
            code,
            checksum,
            nfcTagId: entry.nfcTagId,
            dataSnapshot: (entry.dataSnapshot ?? {}) as unknown as Prisma.InputJsonValue,
            createdById,
          },
        });
      }),
    );
    return { createdCount: created.length, tickets: created };
  }

  findAll(templateId?: string, eventId?: string) {
    return this.prisma.generatedTicket.findMany({
      where: { templateId: templateId || undefined, eventId: eventId || undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const ticket = await this.prisma.generatedTicket.findUnique({ where: { id }, include: { template: true } });
    if (!ticket) {
      throw new NotFoundException('Billet introuvable');
    }
    return ticket;
  }

  /** Vérifie l'intégrité d'un code (checksum Mode 4) et son existence réelle — utilisé par le futur module 6 au scan. */
  async verifyCode(code: string) {
    const checksumValid = verifySecureCode(code);
    if (!checksumValid) {
      return { checksumValid: false, exists: false, ticket: null };
    }
    const ticket = await this.prisma.generatedTicket.findUnique({ where: { code } });
    return { checksumValid: true, exists: !!ticket, ticket };
  }

  async getCodeImage(id: string, type: CodeImageType) {
    const ticket = await this.findById(id);
    const dataUrl = await renderCodeImage(ticket.code, type);
    return { dataUrl };
  }

  /** Droit distinct de la génération initiale (`tickets:reprint`) : traçabilité obligatoire d'un billet perdu/réimprimé. */
  async reprint(id: string, reprintedBy: string) {
    await this.findById(id);
    return this.prisma.generatedTicket.update({
      where: { id },
      data: {
        reprintCount: { increment: 1 },
        lastReprintedAt: new Date(),
        lastReprintedBy: reprintedBy,
      },
    });
  }

  /** Liste noire (module 6) : un billet annulé échoue désormais la validation au scan, même si son checksum reste correct. */
  async cancel(id: string, cancelledBy: string) {
    await this.findById(id);
    return this.prisma.generatedTicket.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy },
    });
  }

  async exportCsv(templateId?: string): Promise<string> {
    const tickets = await this.findAll(templateId);
    const header = 'code,checksum,nfcTagId,reprintCount,createdAt';
    const rows = tickets.map((t) =>
      [t.code, t.checksum, t.nfcTagId ?? '', t.reprintCount, t.createdAt.toISOString()].join(','),
    );
    return [header, ...rows].join('\n');
  }

  private async assertTemplateExists(templateId: string) {
    const template = await this.prisma.ticketTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new NotFoundException('Gabarit introuvable');
    }
    return template;
  }

  private async assertNfcTagAvailable(nfcTagId: string) {
    const existing = await this.prisma.generatedTicket.findUnique({ where: { nfcTagId } });
    if (existing) {
      throw new ConflictException(`Identifiant NFC/RFID déjà associé à un autre billet : ${nfcTagId}`);
    }
  }

  private async assertSeatAvailable(seatId: string, token: string) {
    const { status, data: seat } = await this.servicesClient.getSeat(token, seatId);
    if (status === 404) {
      throw new NotFoundException('Siège introuvable');
    }
    if (seat.status !== 'AVAILABLE') {
      throw new ConflictException(`Ce siège n'est plus disponible (statut actuel : ${seat.status})`);
    }
  }
}
