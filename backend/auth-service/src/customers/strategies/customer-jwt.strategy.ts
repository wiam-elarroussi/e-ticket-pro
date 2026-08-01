import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { CustomerJwtPayload } from '../interfaces/customer-jwt-payload.interface';

/** Même clé publique RS256 que le staff (JwtStrategy) : le claim `type: 'customer'`
 * est ce qui distingue les deux domaines, pas la clé de signature. */
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
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

  async validate(payload: CustomerJwtPayload): Promise<CustomerJwtPayload> {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Token invalide pour ce point d’accès');
    }
    try {
      const isRevoked = await this.redisService.get(`customer-session:${payload.sid}:revoked`);
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
