import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

/**
 * Vérification 100% locale via la clé PUBLIQUE RS256 partagée avec
 * auth-service — aucun appel réseau vers auth-service pour valider un token.
 * Seul le flag de révocation (posé par auth-service dans le Redis partagé)
 * est consulté, pour que la révocation d'urgence d'une session (module 1.3)
 * coupe aussi immédiatement l'accès à ce microservice.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: Buffer.from(configService.getOrThrow<string>('JWT_PUBLIC_KEY'), 'base64').toString('utf8'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const isRevoked = await this.redisService.get(`session:${payload.sid}:revoked`);
    if (isRevoked) {
      throw new UnauthorizedException('Session révoquée');
    }
    return payload;
  }
}
