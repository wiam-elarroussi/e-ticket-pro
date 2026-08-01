import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PartnerJwtPayload } from '../interfaces/partner-jwt-payload.interface';

/** Même clé publique RS256 que le staff/client (JwtStrategy/CustomerJwtStrategy) :
 * le claim `type: 'partner'` est ce qui distingue ce domaine, pas la clé de signature. */
@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: Buffer.from(configService.getOrThrow<string>('JWT_PUBLIC_KEY'), 'base64').toString('utf8'),
    });
  }

  validate(payload: PartnerJwtPayload): PartnerJwtPayload {
    if (payload.type !== 'partner') {
      throw new UnauthorizedException('Token invalide pour ce point d’accès');
    }
    return payload;
  }
}
