import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SalesQuotasService } from './sales-quotas.service';
import { CreateSalesQuotaDto } from './dto/create-sales-quota.dto';
import { UpdateSalesQuotaDto } from './dto/update-sales-quota.dto';
import { SetQuotaStatusDto } from './dto/set-quota-status.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-quotas')
export class SalesQuotasController {
  constructor(private readonly salesQuotasService: SalesQuotasService) {}

  @RequirePermissions('sales-quotas:read')
  @Get()
  findAll(@Query('eventId') eventId?: string) {
    return this.salesQuotasService.findAll(eventId);
  }

  /**
   * Appelée par pos-service lors d'un checkout public (E-Ticket-Pay) avec le
   * token du client final — doit précéder ':id'. Même sortie que GET
   * ci-dessus, juste accessible sans permission staff.
   */
  @Public()
  @Get('public')
  findAllPublic(@Query('eventId') eventId?: string) {
    return this.salesQuotasService.findAll(eventId);
  }

  @RequirePermissions('sales-quotas:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesQuotasService.findById(id);
  }

  @RequirePermissions('sales-quotas:manage')
  @Post()
  create(@Body() dto: CreateSalesQuotaDto) {
    return this.salesQuotasService.create(dto);
  }

  @RequirePermissions('sales-quotas:manage')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalesQuotaDto) {
    return this.salesQuotasService.update(id, dto);
  }

  /** Action d'urgence : blocage/déblocage instantané, sans droit de configuration complet. */
  @RequirePermissions('sales-quotas:toggle')
  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetQuotaStatusDto) {
    return this.salesQuotasService.setStatus(id, dto);
  }

  @RequirePermissions('sales-quotas:manage')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesQuotasService.remove(id);
  }
}
