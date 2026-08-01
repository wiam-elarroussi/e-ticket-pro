import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @RequirePermissions('venues:read')
  @Get()
  findAll() {
    return this.venuesService.findAll();
  }

  @RequirePermissions('venues:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.venuesService.findById(id);
  }

  /** Plan complet d'une enceinte — lecture publique consommée par E-Ticket-Pay (plan 2D, choix de siège). */
  @Public()
  @Get(':id/full')
  findFullTree(@Param('id', ParseUUIDPipe) id: string) {
    return this.venuesService.findFullTree(id);
  }

  @RequirePermissions('venues:create')
  @Post()
  create(@Body() dto: CreateVenueDto, @CurrentUser() user: JwtPayload) {
    return this.venuesService.create(dto, user.sub);
  }

  @RequirePermissions('venues:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVenueDto) {
    return this.venuesService.update(id, dto);
  }

  @RequirePermissions('venues:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.venuesService.remove(id);
  }
}
