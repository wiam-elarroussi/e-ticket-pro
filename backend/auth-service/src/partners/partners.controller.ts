import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto, PartnerStatusDto } from './dto/update-partner.dto';
import { PartnerLoginDto } from './dto/partner-login.dto';
import { CurrentPartner } from './decorators/current-partner.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /** Portail partenaire (module 4) : connexion par clé API. */
  @Public()
  @Post('login')
  login(@Body() dto: PartnerLoginDto) {
    return this.partnersService.loginWithApiKey(dto.apiKey);
  }

  /** Portail partenaire : tableau de bord du partenaire connecté (profil + quotas). Doit précéder ':id'. */
  @Public()
  @UseGuards(AuthGuard('partner-jwt'))
  @Get('me')
  findMe(@CurrentPartner('sub') partnerId: string) {
    return this.partnersService.findMyDashboard(partnerId);
  }

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

  /** Émet/régénère la clé API du portail partenaire — affichée une seule fois côté client. */
  @RequirePermissions('partners:update')
  @Post(':id/api-key')
  generateApiKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.generateApiKey(id);
  }
}
