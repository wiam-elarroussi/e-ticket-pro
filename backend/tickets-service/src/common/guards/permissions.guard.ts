import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Contrairement à auth-service (qui recalcule les permissions effectives
 * depuis sa base pour rester à jour en temps réel), ce microservice n'a pas
 * accès à la table des rôles/permissions (base séparée) : il fait confiance
 * au snapshot "perms" du JWT, rafraîchi au plus tard au prochain refresh
 * token (15 min). Compromis assumé pour éviter un appel réseau croisé entre
 * microservices à chaque requête.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

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
