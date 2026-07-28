import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6,8}$/, { message: 'Couleur hex invalide (ex: #4F46E5)' })
  colorHex?: string;
}
