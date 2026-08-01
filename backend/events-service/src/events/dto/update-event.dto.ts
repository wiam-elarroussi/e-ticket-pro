import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { EventStatusDto, EventTypeDto } from './create-event.dto';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(EventTypeDto)
  type?: EventTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeTeam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  awayTeam?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsEnum(EventStatusDto)
  status?: EventStatusDto;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  salesOpenAt?: string;

  @IsOptional()
  @IsDateString()
  salesCloseAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
