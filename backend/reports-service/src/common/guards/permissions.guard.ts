import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Comme les autres microservices : pas d'accès à la table des rôles/permissions
 * (base séparée, propriété de auth-service), donc confiance dans le snapshot
 * "perms" du JWT, rafraîchi au plus tard au prochain refresh token (15 min).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user }: { user?: JwtPayload } = context.switchToHttp().getRequest();

    if (!user || !required.every((perm) => user.perms.includes(perm))) {
      throw new ForbiddenException('Permissions insuffisantes pour cette action');
    }

    return true;
  }
}
