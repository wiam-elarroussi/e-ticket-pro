/** Même forme que le payload émis par auth-service — vérifié ici via la clé publique RS256 partagée. */
export interface JwtPayload {
  sub: string;
  role: string;
  perms: string[];
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}
