import { IsInt, IsOptional, Min } from 'class-validator';

// Le scope et la cible ne se modifient pas : on en crée une nouvelle. Seul le
// plafond est éditable ici — le blocage/déblocage passe par un endpoint dédié
// (droit distinct `quotas:toggle`, voir SetQuotaStatusDto).
export class UpdateSalesQuotaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;
}
