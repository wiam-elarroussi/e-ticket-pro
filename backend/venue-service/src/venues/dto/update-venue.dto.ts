import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
