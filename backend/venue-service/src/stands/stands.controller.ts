import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { StandsService } from './stands.service';
import { CreateStandDto } from './dto/create-stand.dto';
import { UpdateStandDto } from './dto/update-stand.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stands')
export class StandsController {
  constructor(private readonly standsService: StandsService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.standsService.findAll(venueId);
  }

  @RequirePermissions('venues:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.standsService.findById(id);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateStandDto) {
    return this.standsService.create(dto);
  }

  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStandDto) {
    return this.standsService.update(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.standsService.remove(id);
  }
}
