import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  templateId!: string;

  /** Champ propre (pas seulement dans dataSnapshot) : permet au contrôle d'accès (module 6) de vérifier efficacement l'événement sans parser le JSON. */
  @IsOptional()
  @IsUUID()
  eventId?: string;

  /** Siège nominatif associé (sélecteur de sièges libres, module 4) : déclenche la vérification de disponibilité
   * et le passage à SOLD auprès de venue-service. Optionnel — un billet peut ne pas être nominatif. */
  @IsOptional()
  @IsUUID()
  seatId?: string;

  /** Données injectées dans le gabarit au rendu (événement, place, acheteur...), figées pour les réimpressions futures. */
  @IsObject()
  dataSnapshot!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;
}
