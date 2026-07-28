import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTicketCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresNominativeInfo?: boolean;
}
