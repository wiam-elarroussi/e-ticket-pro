import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../common/decorators/public.decorator';
import { CustomersService } from './customers.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RefreshCustomerTokenDto } from './dto/refresh-customer-token.dto';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { CustomerJwtPayload } from './interfaces/customer-jwt-payload.interface';

/**
 * Identité spectateur (E-Ticket-Pay) — toutes les routes sont @Public() vis-à-vis
 * des guards globaux staff (JwtAuthGuard/RolesGuard/PermissionsGuard), et
 * protégées individuellement par les stratégies customer-* quand nécessaire.
 */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterCustomerDto) {
    return this.customersService.register(dto);
  }

  @Public()
  @UseGuards(AuthGuard('customer-local'))
  @Post('login')
  async login(@Req() req: Request, @Body() _dto: LoginCustomerDto) {
    const customer = req.user as { id: string };
    return this.customersService.login(customer.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @UseGuards(AuthGuard('customer-jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req: Request, @Body() _dto: RefreshCustomerTokenDto) {
    const { customerId, sessionId } = req.user as { customerId: string; sessionId: string };
    return this.customersService.refresh(customerId, sessionId);
  }

  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Post('logout')
  async logout(@CurrentCustomer() customer: CustomerJwtPayload) {
    await this.customersService.logout(customer.sid);
    return { success: true };
  }

  @Public()
  @UseGuards(AuthGuard('customer-jwt'))
  @Get('me')
  async me(@CurrentCustomer('sub') customerId: string) {
    return this.customersService.getProfile(customerId);
  }
}
