import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStandDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
