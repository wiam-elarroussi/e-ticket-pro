import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum PaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  VOUCHER = 'VOUCHER',
}

/**
 * `standId`/`zoneId` sont fournis par le frontend (déjà connus depuis la
 * page plan/zone où l'opérateur clique le siège) plutôt que re-dérivés côté
 * serveur — évite un aller-retour supplémentaire vers venue-service pour
 * remonter l'ascendance du siège à chaque ligne du panier.
 */
export class OrderItemInputDto {
  @IsUUID()
  seatId!: string;

  @IsUUID()
  standId!: string;

  @IsUUID()
  zoneId!: string;

  @IsUUID()
  categoryId!: string;
}

export class CreateOrderDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  venueId!: string;

  @IsUUID()
  channelId!: string;

  @IsUUID()
  templateId!: string;

  @IsEnum(PaymentMethodDto)
  paymentMethod!: PaymentMethodDto;

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
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
