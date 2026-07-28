import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../auth/permissions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(dto: CreateUserDto, createdById: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });

    if (existing) {
      throw new ConflictException("Nom d'utilisateur ou email déjà utilisé");
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        roleId: dto.roleId,
        createdById,
        userPermissions: dto.permissionIds
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permissionId,
                effect: 'GRANT' as const,
              })),
            }
          : undefined,
      },
      include: { role: true },
    });

    return this.omitPassword(user);
  }

  /**
   * Liste des utilisateurs enrichie d'un statut de présence temps réel : utile
   * en jour d'événement pour vérifier d'un coup d'œil que les guichets et
   * points de contrôle sont bien connectés à leurs terminaux.
   */
  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        userPermissions: { include: { permission: true } },
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { lastActivityAt: 'desc' },
          take: 1,
          select: { lastActivityAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return users.map(({ sessions, ...u }) => {
      const activeSessionLastActivity = sessions[0]?.lastActivityAt ?? null;
      const isOnline = activeSessionLastActivity
        ? now - activeSessionLastActivity.getTime() < ONLINE_THRESHOLD_MS
        : false;
      // "Dernière connexion" doit refléter la vraie dernière connexion même si
      // la session active a expiré/été révoquée depuis (ex: déconnexion normale) —
      // sinon un compte simplement déconnecté s'affiche à tort "Jamais connecté".
      // lastLoginAt est mis à jour à chaque login et ne dépend d'aucune session.
      const lastSeenAt = activeSessionLastActivity ?? u.lastLoginAt;
      return { ...this.omitPassword(u), isOnline, lastSeenAt };
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        userPermissions: { include: { permission: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return this.omitPassword(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username }, include: { role: true } });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (dto.username || dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.username ? [{ username: dto.username }] : []),
            ...(dto.email ? [{ email: dto.email }] : []),
          ],
        },
      });
      if (conflict) {
        throw new ConflictException("Nom d'utilisateur ou email déjà utilisé");
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) {
        throw new NotFoundException('Rôle introuvable');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        roleId: dto.roleId,
        isActive: dto.isActive,
      },
      include: { role: true },
    });

    // Rôle ou statut changé -> le snapshot de permissions en cache doit être recalculé
    await this.permissionsService.invalidate(id);

    return this.omitPassword(updated);
  }

  async remove(id: string, actingUserId: string) {
    if (id === actingUserId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }

    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.role.code === 'SUPER_ADMIN') {
      const remainingSuperAdmins = await this.prisma.user.count({
        where: { role: { code: 'SUPER_ADMIN' }, id: { not: id } },
      });
      if (remainingSuperAdmins === 0) {
        throw new ForbiddenException('Impossible de supprimer le dernier Super Administrateur');
      }
    }

    await this.prisma.user.delete({ where: { id } });
    await this.permissionsService.invalidate(id);
    return { success: true };
  }

  /** Attribution dynamique granulaire d'une permission (1.2), au-delà du rôle de base. */
  async setPermissionOverride(userId: string, dto: SetUserPermissionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const permission = await this.prisma.permission.findUnique({ where: { id: dto.permissionId } });
    if (!permission) {
      throw new NotFoundException('Permission introuvable');
    }

    const override = await this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: dto.permissionId } },
      update: { effect: dto.effect },
      create: { userId, permissionId: dto.permissionId, effect: dto.effect },
      include: { permission: true },
    });

    await this.permissionsService.invalidate(userId);
    return override;
  }

  async removePermissionOverride(userId: string, permissionId: string) {
    try {
      await this.prisma.userPermission.delete({
        where: { userId_permissionId: { userId, permissionId } },
      });
    } catch {
      throw new NotFoundException('Override de permission introuvable');
    }

    await this.permissionsService.invalidate(userId);
    return { success: true };
  }

  private omitPassword<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }
}
