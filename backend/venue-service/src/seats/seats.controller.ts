import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';
import { BulkUpdateSeatStatusDto } from './dto/bulk-update-seat-status.dto';
import { PublicUpdateSeatStatusDto } from './dto/public-update-seat-status.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('rowId') rowId?: string) {
    return this.seatsService.findAll(rowId);
  }

  /** Lecture publique : le plan de sélection d'E-Ticket-Pay a besoin du statut temps réel d'un siège. */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatsService.findById(id);
  }

  /** Réservation temporaire panier (E-Ticket-Pay), 10 min — voir SeatsService.holdSeat. */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Post(':id/hold')
  holdSeat(@Param('id', ParseUUIDPipe) id: string, @CurrentCustomer('sub') customerId: string) {
    return this.seatsService.holdSeat(id, customerId);
  }

  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Delete(':id/hold')
  releaseSeat(@Param('id', ParseUUIDPipe) id: string, @CurrentCustomer('sub') customerId: string) {
    return this.seatsService.releaseSeat(id, customerId);
  }

  /** Transition déclenchée par le flux d'achat public (pos-service, module Réservation & Achat). */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Patch(':id/public-status')
  publicUpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublicUpdateSeatStatusDto,
    @CurrentCustomer('sub') customerId: string,
  ) {
    return this.seatsService.publicUpdateStatus(id, dto, customerId);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateSeatDto) {
    return this.seatsService.create(dto);
  }

  /**
   * Action groupée (sélection multiple/rectangle dans l'éditeur) : évite N clics répétés.
   * Droit distinct de `venues:update` — un Superviseur peut changer l'état des sièges
   * sans avoir le droit de modifier la structure/le plan.
   */
  @RequirePermissions('venues:seats:manage')
  @Patch('bulk-status')
  bulkUpdateStatus(@Body() dto: BulkUpdateSeatStatusDto) {
    return this.seatsService.bulkUpdateStatus(dto);
  }

  /** Changement d'état ponctuel d'un siège (Disponible/Réservé/Vendu/Hors-service). */
  @RequirePermissions('venues:seats:manage')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSeatStatusDto) {
    return this.seatsService.updateStatus(id, dto);
  }

  /** Repositionnement/étiquetage dans l'éditeur de plan (structure, pas l'état). */
  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSeatDto) {
    return this.seatsService.update(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatsService.remove(id);
  }
}
