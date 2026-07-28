import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto, PartnerStatusDto } from './dto/update-partner.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @RequirePermissions('partners:read')
  @Get()
  findAll() {
    return this.partnersService.findAll();
  }

  // Doit rester déclaré avant ":id", sinon Express route "archives" vers
  // findOne() et ParseUUIDPipe rejette "archives" comme UUID invalide
  // (même piège que /users/me).
  @RequirePermissions('partners:read')
  @Get('archives')
  findArchived() {
    return this.partnersService.findArchived();
  }

  @RequirePermissions('partners:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.findById(id);
  }

  @RequirePermissions('partners:create')
  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @RequirePermissions('partners:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }

  /** Suspension/réactivation d'urgence d'un partenaire entier (1.3). */
  @RequirePermissions('partners:update')
  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: PartnerStatusDto) {
    return this.partnersService.setStatus(id, status);
  }

  /** Archivage (soft delete) : masque le partenaire, coupe ses canaux de vente. */
  @RequirePermissions('partners:update')
  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.partnersService.archive(id, user.sub);
  }

  /** Réintègre un partenaire archivé dans la liste active. */
  @RequirePermissions('partners:update')
  @Patch(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.restore(id);
  }

  /** Suppression définitive — permission distincte, plus stricte que la simple mise à jour. */
  @RequirePermissions('partners:delete')
  @Delete(':id')
  hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.hardDelete(id);
  }
}
