import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePartnerQuotaDto {
  @IsUUID()
  partnerId!: string;

  @IsOptional()
  @IsUUID()
  salesChannelId?: string;

  // Réfs "molles" vers le module 3 (Événements/Tarifs), pas encore construit.
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  ticketCategoryId?: string;

  @IsInt()
  @Min(1)
  maxQuantity!: number;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
