import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStandDto {
  @IsUUID()
  venueId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
