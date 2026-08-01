import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AccreditationType } from '@prisma/client';

export class CreateTicketCategoryDto {
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code en majuscules, chiffres et underscores uniquement (ex: PLEIN_TARIF)' })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresNominativeInfo?: boolean;

  /** Population accréditée (VIP/presse/délégations) — PUBLIC par défaut pour la billetterie grand public. */
  @IsOptional()
  @IsEnum(AccreditationType)
  accreditationType?: AccreditationType;
}
