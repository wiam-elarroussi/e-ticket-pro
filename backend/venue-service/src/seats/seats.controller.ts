import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';
import { BulkUpdateSeatStatusDto } from './dto/bulk-update-seat-status.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('rowId') rowId?: string) {
    return this.seatsService.findAll(rowId);
  }

  @RequirePermissions('venues:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatsService.findById(id);
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
