import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { NumberingDirectionDto } from './generate-seats.dto';

export class UpdateRowDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsEnum(NumberingDirectionDto)
  numberingDirection?: NumberingDirectionDto;
}
