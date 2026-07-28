import { IsArray, IsUUID } from 'class-validator';

export class SetZoneGateAccessDto {
  @IsArray()
  @IsUUID('4', { each: true })
  gateIds!: string[];
}
