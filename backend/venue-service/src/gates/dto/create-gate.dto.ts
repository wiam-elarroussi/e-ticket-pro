import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateGateDto {
  @IsUUID()
  venueId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
