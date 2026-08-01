import { IsString, MinLength } from 'class-validator';

export class PartnerLoginDto {
  @IsString()
  @MinLength(10)
  apiKey!: string;
}
