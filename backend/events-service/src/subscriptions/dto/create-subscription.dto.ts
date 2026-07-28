import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  formulaId!: string;

  @IsString()
  @MaxLength(150)
  holderName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  holderEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  holderPhone?: string;

  /** Place nominative fixe pour toute la formule (facultatif). */
  @IsOptional()
  @IsUUID()
  seatId?: string;

  /** UID de la carte physique NFC/RFID, saisi au guichet via un lecteur USB. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;
}
