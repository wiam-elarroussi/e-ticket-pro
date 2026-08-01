import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TicketCategoriesService } from './ticket-categories.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly ticketCategoriesService: TicketCategoriesService) {}

  @RequirePermissions('pricing:read')
  @Get()
  findAll() {
    return this.ticketCategoriesService.findAll();
  }

  /** Catalogue public (E-Ticket-Pay) : le sélecteur de siège doit afficher les catégories de billet disponibles. Doit précéder ':id'. */
  @Public()
  @Get('public')
  findAllPublic() {
    return this.ticketCategoriesService.findAll();
  }

  @RequirePermissions('pricing:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketCategoriesService.findById(id);
  }

  @RequirePermissions('pricing:create')
  @Post()
  create(@Body() dto: CreateTicketCategoryDto) {
    return this.ticketCategoriesService.create(dto);
  }

  @RequirePermissions('pricing:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketCategoryDto) {
    return this.ticketCategoriesService.update(id, dto);
  }

  @RequirePermissions('pricing:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketCategoriesService.remove(id);
  }
}
