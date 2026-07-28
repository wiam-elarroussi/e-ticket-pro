import { ArrayMinSize, ArrayMaxSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { SeatStatusDto } from './update-seat-status.dto';

export class BulkUpdateSeatStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  seatIds!: string[];

  @IsEnum(SeatStatusDto)
  status!: SeatStatusDto;
}
