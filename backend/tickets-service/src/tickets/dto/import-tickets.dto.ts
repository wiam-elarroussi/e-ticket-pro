import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

class ImportEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nfcTagId?: string;

  @IsOptional()
  @IsObject()
  dataSnapshot?: Record<string, unknown>;
}

/** Génération en masse (ex: lot de bracelets VIP pré-imprimés à associer à des puces NFC). */
export class ImportTicketsDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportEntryDto)
  entries!: ImportEntryDto[];
}
