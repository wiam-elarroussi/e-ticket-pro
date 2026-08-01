import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PublicPurchaseSubscriptionDto {
  @IsUUID()
  formulaId!: string;

  @IsString()
  @MaxLength(150)
  holderName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  holderEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  holderPhone?: string;
}
