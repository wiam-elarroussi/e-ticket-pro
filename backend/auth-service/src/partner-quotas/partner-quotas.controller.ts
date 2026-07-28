import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PartnerQuotasService } from './partner-quotas.service';
import { CreatePartnerQuotaDto } from './dto/create-partner-quota.dto';
import { UpdatePartnerQuotaDto } from './dto/update-partner-quota.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('partner-quotas')
export class PartnerQuotasController {
  constructor(private readonly partnerQuotasService: PartnerQuotasService) {}

  @RequirePermissions('partners:read')
  @Get()
  findAll(@Query('partnerId') partnerId?: string) {
    return this.partnerQuotasService.findAll(partnerId);
  }

  @RequirePermissions('quotas:manage')
  @Post()
  create(@Body() dto: CreatePartnerQuotaDto) {
    return this.partnerQuotasService.create(dto);
  }

  @RequirePermissions('quotas:manage')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerQuotaDto) {
    return this.partnerQuotasService.update(id, dto);
  }

  @RequirePermissions('quotas:manage')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerQuotasService.remove(id);
  }
}
