import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenPayload } from '../../common/interfaces/jwt-payload.interface';

const extractRefreshToken = ExtractJwt.fromBodyField('refreshToken');

/**
 * Le refresh token est un JWT HS256 séparé du token d'accès (secret connu
 * uniquement de auth-service, jamais distribué aux devices Edge). Sa validité
 * de signature ne suffit pas : on vérifie aussi qu'il correspond au hash stocké
 * pour la session (rotation) et que la session n'a pas été révoquée entre temps.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload) {
    const rawToken = extractRefreshToken(req);

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });

    if (!session || session.revokedAt || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session invalide ou révoquée');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expirée');
    }

    const incomingHash = crypto.createHash('sha256').update(rawToken as string).digest('hex');
    if (incomingHash !== session.refreshTokenHash) {
      // Le hash stocké ne correspond plus à ce token : soit il a déjà été
      // consommé par une rotation précédente (rejeu), soit falsifié.
      throw new UnauthorizedException('Refresh token invalide ou déjà utilisé');
    }

    return { userId: payload.sub, sessionId: payload.sid };
  }
}
