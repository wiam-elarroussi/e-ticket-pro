import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../common/decorators/public.decorator';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { WalletService } from './wallet.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';

/** Portefeuille Cashless (E-Ticket-Pay, module M4) — exclusivement client final, pas de pendant staff. */
@Public()
@UseGuards(AuthGuard('customer-jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@CurrentCustomer('sub') customerId: string) {
    return this.walletService.getOrCreateWallet(customerId);
  }

  @Post('topup')
  topup(@CurrentCustomer('sub') customerId: string, @Body() dto: TopupWalletDto) {
    return this.walletService.topup(customerId, dto);
  }

  @Get('transactions')
  listTransactions(@CurrentCustomer('sub') customerId: string) {
    return this.walletService.listTransactions(customerId);
  }
}
