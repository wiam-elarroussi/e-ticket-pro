import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const CACHE_TTL_SECONDS = 300;

/**
 * Calcule les permissions effectives d'un utilisateur : celles de son rôle,
 * plus les GRANT et moins les DENY définis individuellement (user_permissions),
 * conformément à l'exigence 1.2 "attribution dynamique granulaire des privilèges".
 * Résultat mis en cache Redis pour éviter un aller-retour Postgres par requête.
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getEffectivePermissions(userId: string): Promise<string[]> {
    const cacheKey = `perms:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        userPermissions: { include: { permission: true } },
      },
    });

    const effective = new Set(user.role.rolePermissions.map((rp) => rp.permission.code));

    for (const override of user.userPermissions) {
      if (override.effect === 'GRANT') {
        effective.add(override.permission.code);
      } else {
        effective.delete(override.permission.code);
      }
    }

    const permissions = Array.from(effective);
    await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', CACHE_TTL_SECONDS);
    return permissions;
  }

  /** À appeler à chaque changement de rôle/permissions ou lors d'une révocation de session. */
  async invalidate(userId: string): Promise<void> {
    await this.redis.del(`perms:${userId}`);
  }
}
