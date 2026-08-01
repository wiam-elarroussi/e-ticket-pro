import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { OrderItemInputDto } from './create-order.dto';

/** Moyens de paiement disponibles au checkout public E-Ticket-Pay — tous simulés
 * côté serveur (pas de passerelle bancaire/Apple/Google réelle intégrée). */
export enum PublicPaymentMethodDto {
  CARD = 'CARD',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

/** Panier E-Ticket-Pay : pas de channelId (résolu côté serveur, canal WEB unique). */
export class CreatePublicOrderDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  venueId!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsEnum(PublicPaymentMethodDto)
  paymentMethod?: PublicPaymentMethodDto;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  buyerName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  buyerPhone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
