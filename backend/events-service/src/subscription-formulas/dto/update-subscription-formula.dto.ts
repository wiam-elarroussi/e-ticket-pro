import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateSubscriptionFormulaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  globalAccess?: boolean;
}
