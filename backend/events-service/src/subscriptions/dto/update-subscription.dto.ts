import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum SubscriptionStatusDto {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  holderName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  holderEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  holderPhone?: string;

  @IsOptional()
  @IsUUID()
  seatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatusDto)
  status?: SubscriptionStatusDto;
}
