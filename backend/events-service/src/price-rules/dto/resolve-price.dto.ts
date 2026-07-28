import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ResolvePriceQueryDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  standId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  seatId?: string;

  /** Instant de résolution (tarification dynamique par période) — par défaut, maintenant. */
  @IsOptional()
  @IsISO8601()
  at?: string;
}
