import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { GatesService } from './gates.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('gates')
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.gatesService.findAll(venueId);
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
