import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRowDto {
  @IsUUID()
  zoneId!: string;

  @IsString()
  @MaxLength(50)
  label!: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
