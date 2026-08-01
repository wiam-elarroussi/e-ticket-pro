import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../auth/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { label: 'asc' },
    });
  }

  listPermissionsCatalog() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Un rôle avec ce code existe déjà');
    }

    return this.prisma.role.create({
      data: {
        code: dto.code,
        label: dto.label,
        isSystem: false,
        rolePermissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: { label: dto.label },
      include: {
        rolePermissions: { include: { permission: true } },
        users: { select: { id: true } },
      },
    });

    // Un changement de permissions doit se répercuter immédiatement sur tous
    // les utilisateurs porteurs de ce rôle, pas seulement à leur prochain login.
    await Promise.all(updated.users.map((u) => this.permissionsService.invalidate(u.id)));

    return updated;
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }

    if (role.users.length > 0) {
      const fallbackRole = await this.prisma.role.findFirst({
        where: { code: { in: ['CAISSIER', 'SUPERVISEUR', 'SUPER_ADMIN'] }, id: { not: id } },
      });
      if (fallbackRole) {
        await this.prisma.user.updateMany({
          where: { roleId: id },
          data: { roleId: fallbackRole.id },
        });
      }
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
