import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePartnerQuotaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
