import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsHexColor, IsInt, IsOptional, IsString, Min, MaxLength, ValidateNested } from 'class-validator';
import { TemplateElementDto } from './template-element.dto';

export class UpdateTicketTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(50)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  height?: number;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  backgroundImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TemplateElementDto)
  elements?: TemplateElementDto[];
}
