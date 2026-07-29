import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CompareEventsQueryDto {
  /** Liste d'IDs d'événements séparés par des virgules (ex: ?eventIds=a,b,c). */
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  eventIds!: string[];
}
