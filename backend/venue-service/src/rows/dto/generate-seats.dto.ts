import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum NumberingDirectionDto {
  LEFT_TO_RIGHT = 'LEFT_TO_RIGHT',
  RIGHT_TO_LEFT = 'RIGHT_TO_LEFT',
}

export class GenerateSeatsDto {
  @IsInt()
  @Min(1)
  @Max(500)
  count!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  startNumber?: number;

  @IsOptional()
  @IsEnum(NumberingDirectionDto)
  direction?: NumberingDirectionDto;

  /** Si true, supprime les sièges existants du rang avant de régénérer. */
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}
