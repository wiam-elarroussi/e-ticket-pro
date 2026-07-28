import { IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

// Le scope et la cible (event/catégorie/stand/zone/siège) d'une règle ne se
// modifient pas : on en crée une nouvelle. Seuls le prix et la fenêtre de
// validité (tarification dynamique) sont éditables.
export class UpdatePriceRuleDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
