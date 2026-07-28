import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CheckAccessQueryDto } from './dto/check-access-query.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @RequirePermissions('subscriptions:read')
  @Get()
  findAll(@Query('formulaId') formulaId?: string) {
    return this.subscriptionsService.findAll(formulaId);
  }

  @RequirePermissions('subscriptions:create')
  @Post()
  create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.create(dto, user.sub);
  }

  /** Doit précéder ':id' (segment littéral vs paramètre au même niveau). */
  @RequirePermissions('subscriptions:read')
  @Get(':id/access')
  checkAccess(@Param('id', ParseUUIDPipe) id: string, @Query() query: CheckAccessQueryDto) {
    return this.subscriptionsService.checkAccess(id, query.eventId);
  }

  @RequirePermissions('subscriptions:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findById(id);
  }

  @RequirePermissions('subscriptions:update')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }
}
