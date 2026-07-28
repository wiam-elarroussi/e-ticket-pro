import { IsEnum, IsUUID } from 'class-validator';

export enum PermissionEffectDto {
  GRANT = 'GRANT',
  DENY = 'DENY',
}

export class SetUserPermissionDto {
  @IsUUID()
  permissionId!: string;

  @IsEnum(PermissionEffectDto)
  effect!: PermissionEffectDto;
}
