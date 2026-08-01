import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccreditationType } from '@prisma/client';

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

  @IsOptional()
  @IsEnum(AccreditationType)
  accreditationType?: AccreditationType;
}
