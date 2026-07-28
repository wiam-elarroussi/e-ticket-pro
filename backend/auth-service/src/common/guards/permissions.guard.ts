import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../../auth/permissions.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Vérifie les permissions fines (@RequirePermissions(...)).
 * Ne se fie pas au snapshot "perms" du JWT (qui peut être périmé jusqu'à expiration
 * de l'access token) mais recalcule via PermissionsService, qui lit le cache Redis
 * (source de vérité invalidée en temps réel dès qu'un rôle/permission change).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user }: { user?: JwtPayload } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const effectivePermissions = await this.permissionsService.getEffectivePermissions(user.sub);
    const hasAll = required.every((perm) => effectivePermissions.includes(perm));

    if (!hasAll) {
      throw new ForbiddenException('Permissions insuffisantes pour cette action');
    }

    return true;
  }
}
