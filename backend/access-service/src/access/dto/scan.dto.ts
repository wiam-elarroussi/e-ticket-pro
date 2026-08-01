import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Un scan porte exactement un des trois : un code de billet (QR/code-barres
 * 1D/2D, digital ou imprimé), un identifiant NFC/RFID (bracelet ou carte
 * d'accès sans contact — technologie d'ENTRÉE, distincte d'Apple Pay/Google
 * Pay qui sont des moyens de PAIEMENT gérés côté pos-service), ou un
 * identifiant d'abonnement (entrée automatique module 3.3) — jamais plusieurs
 * à la fois. `force` ne produit un déblocage (OVERRIDDEN) que si l'opérateur
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
  @IsString()
  @MaxLength(60)
  nfcTagId?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
