import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PermissionsService } from './permissions.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
  salesChannelId?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min, offline-vérifiable via RS256
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours, rotatif
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const PASSWORD_RESET_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /** Utilisé par LocalStrategy. Retourne l'utilisateur si les identifiants sont valides, sinon null. */
  async validateCredentials(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Compte verrouillé jusqu'à ${user.lockedUntil.toISOString()} suite à trop de tentatives échouées`,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);

    if (!passwordValid) {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      return null;
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return user;
  }

  private async registerFailedAttempt(userId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000) : null,
      },
    });
  }

  /** Ouvre une nouvelle session (table sessions) et émet la première paire de tokens. */
  async login(userId: string, context: DeviceContext): Promise<TokenPair> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true },
    });

    const sessionId = crypto.randomUUID();
    const refreshToken = this.signRefreshToken(user.id, sessionId);
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        salesChannelId: context.salesChannelId,
        refreshTokenHash,
        deviceInfo: { userAgent: context.userAgent ?? null },
        ipAddress: context.ipAddress,
        expiresAt,
      },
    });

    await this.redis.set(`session:${sessionId}:refresh_hash`, refreshTokenHash, 'EX', REFRESH_TOKEN_TTL_SECONDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.issueAccessToken(user.id, user.role.code, sessionId);

    return { accessToken, refreshToken, sessionId, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  /**
   * Rotation du refresh token : l'ancien devient immédiatement inutilisable
   * (son hash est écrasé), un nouveau couple access/refresh est émis.
   */
  async refresh(userId: string, sessionId: string): Promise<TokenPair> {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { user: { include: { role: true } } },
    });

    if (session.revokedAt) {
      throw new UnauthorizedException('Session révoquée');
    }

    const newRefreshToken = this.signRefreshToken(userId, sessionId);
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    await this.redis.set(`session:${sessionId}:refresh_hash`, newRefreshTokenHash, 'EX', REFRESH_TOKEN_TTL_SECONDS);

    const accessToken = await this.issueAccessToken(session.user.id, session.user.role.code, sessionId);

    return { accessToken, refreshToken: newRefreshToken, sessionId, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  /** Déconnexion volontaire par l'utilisateur courant. */
  async logout(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId, null);
  }

  /**
   * Révocation d'urgence (module 1.3) : utilisée par un Admin/Superviseur pour
   * couper une session opérateur (ou par l'utilisateur lui-même) en temps réel.
   *
   * Pose un flag `session:{id}:revoked` en Redis, vérifié par JwtStrategy à
   * chaque requête via le `sid` porté par le token. Contrairement à une
   * blacklist par `jti`, ça fonctionne aussi quand c'est un tiers (admin) qui
   * révoque une session dont il ne connaît pas le jti de l'access token en
   * cours — le seul identifiant stable et connu des deux côtés est le sid.
   */
  async revokeSession(sessionId: string, revokedByUserId: string | null) {
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedById: revokedByUserId ?? undefined },
    });

    await this.redis.del(`session:${sessionId}:refresh_hash`);
    // TTL = durée de vie max d'un access token : au-delà, il aurait de toute
    // façon expiré naturellement, inutile de garder le flag plus longtemps.
    await this.redis.set(`session:${sessionId}:revoked`, '1', 'EX', ACCESS_TOKEN_TTL_SECONDS);

    await this.permissionsService.invalidate(session.userId);

    return session;
  }

  /**
   * Point d'entrée public (1.1 "réinitialisation sécurisée du mot de passe").
   * Ne révèle jamais si l'email existe : retourne silencieusement dans tous les cas.
   */
  async requestPasswordReset(email: string, requestedIp?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
        requestedIp,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      // TODO(module notifications) : remplacer par un envoi d'email réel.
      // eslint-disable-next-line no-console
      console.log(`[password-reset] lien pour ${email} : token=${rawToken}`);
    }
  }

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Lien de réinitialisation invalide ou expiré');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Une réinitialisation de mot de passe est un signal de compromission
    // potentielle : on coupe systématiquement tous les accès déjà ouverts.
    const activeSessions = await this.prisma.session.findMany({
      where: { userId: resetToken.userId, revokedAt: null },
      select: { id: true },
    });
    await Promise.all(activeSessions.map((s) => this.revokeSession(s.id, null)));
  }

  private signRefreshToken(userId: string, sessionId: string): string {
    return this.jwtService.sign(
      { sub: userId, sid: sessionId, jti: crypto.randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithm: 'HS256',
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      },
    );
  }

  private async issueAccessToken(userId: string, roleCode: string, sessionId: string): Promise<string> {
    const permissions = await this.permissionsService.getEffectivePermissions(userId);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      role: roleCode,
      perms: permissions,
      sid: sessionId,
      jti: crypto.randomUUID(),
    };

    return this.jwtService.sign(payload, {
      privateKey: Buffer.from(this.configService.getOrThrow<string>('JWT_PRIVATE_KEY'), 'base64').toString('utf8'),
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
