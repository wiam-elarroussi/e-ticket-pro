import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermissions('orders:read')
  @Get()
  findAll(@Query('eventId') eventId?: string, @Query('channelId') channelId?: string) {
    return this.ordersService.findAll(eventId, channelId);
  }

  @RequirePermissions('orders:read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findById(id);
  }

  /** Vente au guichet — réutilise le droit `pos:sell` déjà porté par Caissier/Opérateur. */
  @RequirePermissions('pos:sell')
  @Post()
  checkout(@Body() dto: CreateOrderDto, @BearerToken() token: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.checkout(dto, token, user.sub);
  }
}
