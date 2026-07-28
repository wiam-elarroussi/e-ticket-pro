import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export enum PriceScopeDto {
  EVENT = 'EVENT',
  STAND = 'STAND',
  ZONE = 'ZONE',
  SEAT = 'SEAT',
}

export class CreatePriceRuleDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  categoryId!: string;

  @IsEnum(PriceScopeDto)
  scope!: PriceScopeDto;

  @ValidateIf((dto) => dto.scope === PriceScopeDto.STAND)
  @IsUUID()
  standId?: string;

  @ValidateIf((dto) => dto.scope === PriceScopeDto.ZONE)
  @IsUUID()
  zoneId?: string;

  @ValidateIf((dto) => dto.scope === PriceScopeDto.SEAT)
  @IsUUID()
  seatId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
