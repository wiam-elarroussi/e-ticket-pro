import { ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export enum SubscriptionFormulaTypeDto {
  SAISON = 'SAISON',
  ELIMINATOIRES = 'ELIMINATOIRES',
  POULES = 'POULES',
}

export class CreateSubscriptionFormulaDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(SubscriptionFormulaTypeDto)
  type!: SubscriptionFormulaTypeDto;

  @IsUUID()
  venueId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  /** Événements couverts dès la création (peut aussi se compléter ensuite via PUT :id/events).
   * Ignoré si globalAccess est activé (la formule couvre alors tous les événements). */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  eventIds?: string[];

  /** Accès global : donne accès à tous les événements de l'enceinte sans avoir à gérer eventIds. */
  @IsOptional()
  @IsBoolean()
  globalAccess?: boolean;
}
