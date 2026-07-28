import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export enum QuotaScopeDto {
  EVENT = 'EVENT',
  STAND = 'STAND',
  ZONE = 'ZONE',
  CHANNEL = 'CHANNEL',
}

export class CreateSalesQuotaDto {
  @IsUUID()
  eventId!: string;

  @IsEnum(QuotaScopeDto)
  scope!: QuotaScopeDto;

  @ValidateIf((dto: CreateSalesQuotaDto) => dto.scope === QuotaScopeDto.STAND)
  @IsUUID()
  standId?: string;

  @ValidateIf((dto: CreateSalesQuotaDto) => dto.scope === QuotaScopeDto.ZONE)
  @IsUUID()
  zoneId?: string;

  @ValidateIf((dto: CreateSalesQuotaDto) => dto.scope === QuotaScopeDto.CHANNEL)
  @IsUUID()
  channelId?: string;

  /** Restriction croisée optionnelle par catégorie (ex: bloquer seulement les VIP d'une tribune). */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Plafond de billets ; laisser vide pour un simple interrupteur (isBlocked) sans limite chiffrée. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
