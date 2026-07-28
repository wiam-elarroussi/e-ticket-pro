import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export { SeatStatusDto } from './update-seat-status.dto';

/** Repositionnement/étiquetage dans l'éditeur (structure) — pas le statut, voir UpdateSeatStatusDto. */
export class UpdateSeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;
}
