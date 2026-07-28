import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export enum EventTypeDto {
  MATCH = 'MATCH',
  COMPETITION = 'COMPETITION',
  SHOW = 'SHOW',
}

export enum EventStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

export class CreateEventDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(EventTypeDto)
  type!: EventTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeTeam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  awayTeam?: string;

  @IsUUID()
  venueId!: string;

  @IsOptional()
  @IsEnum(EventStatusDto)
  status?: EventStatusDto;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsDateString()
  salesOpenAt?: string;

  @IsOptional()
  @IsDateString()
  salesCloseAt?: string;

  /** Limite panier ("max 3 billets par panier") — laisser vide pour aucune limite. */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerOrder?: number;
}
