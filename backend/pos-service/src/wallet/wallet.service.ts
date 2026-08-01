import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopupPaymentMethodDto, TopupWalletDto } from './dto/topup-wallet.dto';

const TOPUP_METHOD_LABEL: Record<TopupPaymentMethodDto, string> = {
  [TopupPaymentMethodDto.CARD]: 'carte bancaire',
  [TopupPaymentMethodDto.APPLE_PAY]: 'Apple Pay',
  [TopupPaymentMethodDto.GOOGLE_PAY]: 'Google Pay',
};

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(customerId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { customerId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { customerId } });
  }

  /**
   * Rechargement carte bancaire simulé (module Cashless, M4) : pas de vraie
   * passerelle de paiement, validation instantanée côté serveur — même
   * principe que le paiement du checkout public (module Réservation & Achat).
   */
  async topup(customerId: string, dto: TopupWalletDto) {
    const wallet = await this.getOrCreateWallet(customerId);
    const methodLabel = TOPUP_METHOD_LABEL[dto.paymentMethod ?? TopupPaymentMethodDto.CARD];
    const label = dto.voucherCode
      ? `Rechargement ${methodLabel} (voucher ${dto.voucherCode})`
      : `Rechargement ${methodLabel}`;

    const [, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: dto.amount } } }),
      this.prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: 'TOPUP', amount: dto.amount, label },
      }),
    ]);

    return { wallet: await this.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } }), transaction };
  }

  async listTransactions(customerId: string) {
    const wallet = await this.getOrCreateWallet(customerId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
