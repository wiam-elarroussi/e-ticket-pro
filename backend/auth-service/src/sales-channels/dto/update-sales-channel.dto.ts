import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateSalesChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu HH:mm' })
  salesWindowStart?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu HH:mm' })
  salesWindowEnd?: string;
}
