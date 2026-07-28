import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
