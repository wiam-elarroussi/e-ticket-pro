import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { GatesService } from './gates.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';
import { GateHeartbeatDto } from './dto/gate-heartbeat.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('gates')
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.gatesService.findAll(venueId);
  }

  /**
   * Consulté par access-service à chaque scan avec siège assigné — droit
   * `access:scan` (pas `venues:read`) pour que les contrôleurs de porte,
   * qui n'ont pas de droit de lecture venue général, puissent l'utiliser.
   */
  @RequirePermissions('access:scan')
  @Get(':id/zone-check')
  checkZoneAccess(@Param('id', ParseUUIDPipe) id: string, @Query('seatId') seatId: string) {
    return this.gatesService.checkZoneAccess(id, seatId);
  }

  /**
   * Battement de vie du poste de contrôle (module 6, monitoring des obstacles
   * physiques) — envoyé par le poste de scan à chaque scan réel, ou déclaré
   * manuellement (FAULT) par un opérateur en cas de panne matérielle.
   */
  @RequirePermissions('access:scan')
  @Post(':id/heartbeat')
  heartbeat(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GateHeartbeatDto) {
    return this.gatesService.heartbeat(id, dto);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateGateDto) {
    return this.gatesService.create(dto);
  }

  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGateDto) {
    return this.gatesService.update(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gatesService.remove(id);
  }
}
