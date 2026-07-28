import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PriceRulesService } from './price-rules.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { ResolvePriceQueryDto } from './dto/resolve-price.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('price-rules')
export class PriceRulesController {
  constructor(private readonly priceRulesService: PriceRulesService) {}

  @RequirePermissions('pricing:read')
  @Get()
  findAll(@Query('eventId') eventId?: string) {
    return this.priceRulesService.findAll(eventId);
  }

  /** Tarif effectif pour une cible donnée (utilisé par le module 5 - POS). Doit précéder ':id'. */
  @RequirePermissions('pricing:read')
  @Get('resolve')
  resolve(@Query() query: ResolvePriceQueryDto) {
    return this.priceRulesService.resolvePrice(query);
  }

  @RequirePermissions('pricing:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceRulesService.findById(id);
  }

  @RequirePermissions('pricing:create')
  @Post()
  create(@Body() dto: CreatePriceRuleDto) {
    return this.priceRulesService.create(dto);
  }

  @RequirePermissions('pricing:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePriceRuleDto) {
    return this.priceRulesService.update(id, dto);
  }

  @RequirePermissions('pricing:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceRulesService.remove(id);
  }
}
