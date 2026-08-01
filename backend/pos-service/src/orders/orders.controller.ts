import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { BearerToken } from '../common/decorators/bearer-token.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePublicOrderDto } from './dto/create-public-order.dto';
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

  /** "Mes billets" (E-Ticket-Pay) : historique des achats du client connecté. Doit précéder ':id'. */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Get('mine')
  findMine(@CurrentCustomer('sub') customerId: string) {
    return this.ordersService.findMineForCustomer(customerId);
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

  /** Achat public E-Ticket-Pay — voir OrdersService.publicCheckout. */
  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Post('public-checkout')
  publicCheckout(
    @Body() dto: CreatePublicOrderDto,
    @BearerToken() token: string,
    @CurrentCustomer('sub') customerId: string,
  ) {
    return this.ordersService.publicCheckout(dto, token, customerId);
  }
}
