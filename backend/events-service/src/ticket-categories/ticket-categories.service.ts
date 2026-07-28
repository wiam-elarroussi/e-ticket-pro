import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';

@Injectable()
export class TicketCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketCategoryDto) {
    const existing = await this.prisma.ticketCategory.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Une catégorie avec ce code existe déjà');
    }
    return this.prisma.ticketCategory.create({ data: dto });
  }

  findAll() {
    return this.prisma.ticketCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }
    return category;
  }

  async update(id: string, dto: UpdateTicketCategoryDto) {
    await this.findById(id);
    return this.prisma.ticketCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.ticketCategory.delete({ where: { id } });
    return { success: true };
  }
}
