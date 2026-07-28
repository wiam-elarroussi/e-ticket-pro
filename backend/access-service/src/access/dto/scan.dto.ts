import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Un scan porte soit un code de billet (QR/code-barres/saisie manuelle),
 * soit un identifiant d'abonnement (entrée automatique module 3.3) — jamais
 * les deux. `force` ne produit un déblocage (OVERRIDDEN) que si l'opérateur
 * porte en plus le droit `access:override` — sans ce droit, `force` est
 * silencieusement ignoré par le service.
 */
export class ScanDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  gateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
