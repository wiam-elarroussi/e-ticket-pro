import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Remplace l'ensemble des événements couverts par la formule (même principe que PUT /zones/:id/gate-access). */
export class SetFormulaEventsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  eventIds!: string[];
}
