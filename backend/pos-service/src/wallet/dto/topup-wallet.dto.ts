import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum TopupPaymentMethodDto {
  CARD = 'CARD',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

export class TopupWalletDto {
  @IsNumber()
  @Min(10)
  @Max(5000)
  amount!: number;

  /** Purement déclaratif pour l'instant — pas de moteur de bons d'achat à valider (hors périmètre M4). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;

  @IsOptional()
  @IsEnum(TopupPaymentMethodDto)
  paymentMethod?: TopupPaymentMethodDto;
}
