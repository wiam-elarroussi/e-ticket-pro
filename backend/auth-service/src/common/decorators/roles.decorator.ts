import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restreint une route à une liste de rôles (ex: @Roles('ADMIN', 'SUPERVISEUR')). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
