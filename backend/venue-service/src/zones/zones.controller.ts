import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { UpdateZonePolygonDto } from './dto/update-zone-polygon.dto';
import { SetZoneGateAccessDto } from './dto/set-zone-gate-access.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('standId') standId?: string) {
    return this.zonesService.findAll(standId);
  }

  @RequirePermissions('venues:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.findById(id);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }

  @RequirePermissions('venues:update')
  @Patch(':id/polygon')
  updatePolygon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZonePolygonDto) {
    return this.zonesService.updatePolygon(id, dto);
  }

  @RequirePermissions('venues:update')
  @Put(':id/gate-access')
  setGateAccess(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetZoneGateAccessDto) {
    return this.zonesService.setGateAccess(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.remove(id);
  }
}
