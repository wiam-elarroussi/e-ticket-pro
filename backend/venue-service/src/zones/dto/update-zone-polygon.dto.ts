import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, ValidateNested } from 'class-validator';

class PointDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}

export class UpdateZonePolygonDto {
  @IsArray()
  @ArrayMinSize(3, { message: 'Un polygone nécessite au moins 3 points' })
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];
}
