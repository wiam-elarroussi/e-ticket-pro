import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerRefreshTokenPayload } from '../interfaces/customer-jwt-payload.interface';

const extractRefreshToken = ExtractJwt.fromBodyField('refreshToken');

@Injectable()
export class CustomerJwtRefreshStrategy extends PassportStrategy(Strategy, 'customer-jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: configService.getOrThrow<string>('JWT_CUSTOMER_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: CustomerRefreshTokenPayload) {
    const rawToken = extractRefreshToken(req);

    const session = await this.prisma.customerSession.findUnique({ where: { id: payload.sid } });

    if (!session || session.revokedAt || session.customerId !== payload.sub) {
      throw new UnauthorizedException('Session invalide ou révoquée');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expirée');
    }

    const incomingHash = crypto.createHash('sha256').update(rawToken as string).digest('hex');
    if (incomingHash !== session.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalide ou déjà utilisé');
    }

    return { customerId: payload.sub, sessionId: payload.sid };
  }
}
