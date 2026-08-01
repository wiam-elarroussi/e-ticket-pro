import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * Vérifie l'access token via la clé PUBLIQUE RS256 uniquement : cette vérification
 * est strictement locale (aucun appel réseau à auth-service), c'est ce qui permet
 * aux mêmes règles d'être appliquées offline sur le serveur Edge (module 6.2).
 * Le seul aller-retour réseau ici est le check du flag de révocation Redis
 * (clé par `sid`, posée par AuthService.revokeSession), qui permet la
 * révocation immédiate d'une session par un tiers (module 1.3 "désactiver en
 * urgence une session opérateur") — même si ce tiers ne connaît pas le jti
 * de l'access token actuellement détenu par l'utilisateur visé.
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
    try {
      const isRevoked = await this.redisService.get(`session:${payload.sid}:revoked`);
      if (isRevoked) {
        throw new UnauthorizedException('Session révoquée');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // Redis unavailable
    }
    return payload;
  }
}
