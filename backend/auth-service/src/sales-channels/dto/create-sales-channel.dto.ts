import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export enum SalesChannelTypeDto {
  LOCAL_POS = 'LOCAL_POS',
  REMOTE_POS = 'REMOTE_POS',
  WEB = 'WEB',
  PARTNER_API = 'PARTNER_API',
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateSalesChannelDto {
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(SalesChannelTypeDto)
  type!: SalesChannelTypeDto;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu HH:mm' })
  salesWindowStart?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu HH:mm' })
  salesWindowEnd?: string;
}
