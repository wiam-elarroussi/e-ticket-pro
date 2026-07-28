import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { PermissionsService } from '../auth/permissions.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  role: { select: { code: true, label: true } },
} as const;

const salesChannelSelect = {
  id: true,
  name: true,
  type: true,
} as const;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /** Sessions actives de l'utilisateur courant ("gestion des sessions actives", 1.1). */
  listForUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        deviceInfo: true,
        issuedAt: true,
        expiresAt: true,
        lastActivityAt: true,
        salesChannel: { select: salesChannelSelect },
      },
    });
  }

  /** Vue globale (Admin/Superviseur), filtrable par utilisateur — identité + rôle + canal d'origine inclus. */
  listActive(filterUserId?: string) {
    return this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        user: { select: userSelect },
        salesChannel: { select: salesChannelSelect },
      },
    });
  }

  /**
   * Révoque une session : autorisé si l'appelant en est le propriétaire
   * (déconnexion d'un de ses autres appareils), ou s'il détient la permission
   * "sessions:revoke" (coupure d'urgence par un Admin/Superviseur, 1.3).
   */
  async revoke(sessionId: string, actingUser: JwtPayload) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }

    const isOwner = session.userId === actingUser.sub;

    if (!isOwner) {
      const effectivePermissions = await this.permissionsService.getEffectivePermissions(actingUser.sub);
      if (!effectivePermissions.includes('sessions:revoke')) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à révoquer cette session");
      }
    }

    return this.authService.revokeSession(sessionId, isOwner ? null : actingUser.sub);
  }

  /** Self-service : "Déconnecter toutes les autres sessions" (garde la session courante). */
  async revokeAllOthers(userId: string, currentSessionId: string) {
    return this.revokeMany(
      { userId, revokedAt: null, id: { not: currentSessionId } },
      null,
    );
  }

  /** Coupure d'urgence : révoque TOUTES les sessions actives d'un utilisateur ciblé (1.3). */
  async revokeAllForUser(targetUserId: string, revokedByUserId: string) {
    return this.revokeMany({ userId: targetUserId, revokedAt: null }, revokedByUserId);
  }

  private async revokeMany(where: { userId: string; revokedAt: null; id?: { not: string } }, revokedByUserId: string | null) {
    const sessions = await this.prisma.session.findMany({ where, select: { id: true } });
    await Promise.all(sessions.map((s) => this.authService.revokeSession(s.id, revokedByUserId)));
    return { revokedCount: sessions.length };
  }
}
