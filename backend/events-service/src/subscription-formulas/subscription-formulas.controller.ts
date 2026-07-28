import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { SubscriptionFormulasService } from './subscription-formulas.service';
import { CreateSubscriptionFormulaDto } from './dto/create-subscription-formula.dto';
import { UpdateSubscriptionFormulaDto } from './dto/update-subscription-formula.dto';
import { SetFormulaEventsDto } from './dto/set-formula-events.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('subscription-formulas')
export class SubscriptionFormulasController {
  constructor(private readonly subscriptionFormulasService: SubscriptionFormulasService) {}

  @RequirePermissions('subscriptions:read')
  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.subscriptionFormulasService.findAll(venueId);
  }

  @RequirePermissions('subscriptions:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionFormulasService.findById(id);
  }

  @RequirePermissions('subscriptions:create')
  @Post()
  create(@Body() dto: CreateSubscriptionFormulaDto) {
    return this.subscriptionFormulasService.create(dto);
  }

  @RequirePermissions('subscriptions:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubscriptionFormulaDto) {
    return this.subscriptionFormulasService.update(id, dto);
  }

  @RequirePermissions('subscriptions:update')
  @Put(':id/events')
  setIncludedEvents(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetFormulaEventsDto) {
    return this.subscriptionFormulasService.setIncludedEvents(id, dto);
  }

  @RequirePermissions('subscriptions:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionFormulasService.remove(id);
  }
}
