import { IsIn } from 'class-validator';

/** Seules ces deux transitions sont permises depuis le flux d'achat public (voir SeatsService.publicUpdateStatus). */
export class PublicUpdateSeatStatusDto {
  @IsIn(['SOLD', 'AVAILABLE'])
  status!: 'SOLD' | 'AVAILABLE';
}
