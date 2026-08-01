import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SalesChannelsService } from './sales-channels.service';
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto';
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-channels')
export class SalesChannelsController {
  constructor(private readonly salesChannelsService: SalesChannelsService) {}

  /** channels:read plutôt que partners:read : un canal de vente n'est pas toujours rattaché à un partenaire (guichets internes), et le POS (module 5) doit pouvoir lister les canaux sans avoir accès aux fiches partenaires. */
  @RequirePermissions('channels:read')
  @Get()
  findAll(@Query('partnerId') partnerId?: string) {
    return this.salesChannelsService.findAll(partnerId);
  }

  /** Résolu par pos-service lors d'un checkout public (E-Ticket-Pay). Doit précéder ':id'. */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Get('web')
  getWebChannel() {
    return this.salesChannelsService.getOrCreateWebChannel();
  }

  @RequirePermissions('channels:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesChannelsService.findById(id);
  }

  @RequirePermissions('channels:manage')
  @Post()
  create(@Body() dto: CreateSalesChannelDto) {
    return this.salesChannelsService.create(dto);
  }

  @RequirePermissions('channels:manage')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalesChannelDto) {
    return this.salesChannelsService.update(id, dto);
  }

  /** Permission distincte et plus largement distribuée (ex: Superviseur) que channels:manage. */
  @RequirePermissions('channels:toggle')
  @Patch(':id/status')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body('isActive') isActive: boolean) {
    return this.salesChannelsService.setActive(id, isActive);
  }
}
