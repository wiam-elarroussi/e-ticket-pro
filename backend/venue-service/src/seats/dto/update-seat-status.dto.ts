import { IsEnum } from 'class-validator';

export enum SeatStatusDto {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

/** Changement d'état opérationnel uniquement (droit distinct de la structure, voir UpdateSeatDto). */
export class UpdateSeatStatusDto {
  @IsEnum(SeatStatusDto)
  status!: SeatStatusDto;
}
