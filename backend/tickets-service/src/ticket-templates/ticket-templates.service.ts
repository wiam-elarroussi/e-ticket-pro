import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTemplateDto } from './dto/create-ticket-template.dto';
import { UpdateTicketTemplateDto } from './dto/update-ticket-template.dto';

@Injectable()
export class TicketTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTicketTemplateDto, createdById: string) {
    return this.prisma.ticketTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        width: dto.width,
        height: dto.height,
        backgroundColor: dto.backgroundColor,
        backgroundImageUrl: dto.backgroundImageUrl,
        elements: (dto.elements ?? []) as unknown as Prisma.InputJsonValue,
        createdById,
      },
    });
  }

  findAll() {
    return this.prisma.ticketTemplate.findMany({
      include: { _count: { select: { generatedTickets: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.ticketTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Gabarit introuvable');
    }
    return template;
  }

  async update(id: string, dto: UpdateTicketTemplateDto) {
    await this.findById(id);
    return this.prisma.ticketTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        width: dto.width,
        height: dto.height,
        backgroundColor: dto.backgroundColor,
        backgroundImageUrl: dto.backgroundImageUrl,
        elements: dto.elements ? (dto.elements as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    const generatedCount = await this.prisma.generatedTicket.count({ where: { templateId: id } });
    if (generatedCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer un gabarit pour lequel des billets ont déjà été générés',
      );
    }
    await this.prisma.ticketTemplate.delete({ where: { id } });
    return { success: true };
  }
}
