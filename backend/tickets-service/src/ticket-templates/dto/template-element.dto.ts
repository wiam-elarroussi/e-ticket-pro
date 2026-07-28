import { IsEnum, IsHexColor, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TemplateElementType {
  TEXT = 'text',
  IMAGE = 'image',
  QRCODE = 'qrcode',
  BARCODE = 'barcode',
}

/**
 * Élément positionné librement sur le gabarit. `binding` pointe vers une clé
 * du payload de données injecté au rendu (ex: "event.name", "buyer.fullName") ;
 * en son absence, `staticText` (texte fixe) ou `imageUrl` (logo/sponsor) sont
 * utilisés selon `type`. Un seul DTO couvre tous les types (plus simple à
 * valider qu'une union discriminée pour un JSON manipulé en bloc par l'éditeur).
 */
export class TemplateElementDto {
  @IsString()
  id!: string;

  @IsEnum(TemplateElementType)
  type!: TemplateElementType;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  width!: number;

  @IsNumber()
  height!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  binding?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  staticText?: string;

  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsIn(['normal', 'bold'])
  fontWeight?: string;

  @IsOptional()
  @IsIn(['left', 'center', 'right'])
  align?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
