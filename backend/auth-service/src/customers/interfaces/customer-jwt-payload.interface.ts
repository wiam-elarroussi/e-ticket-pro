/** Distinct de JwtPayload (staff) par le claim `type` — permet aux autres
 * microservices de reconnaître un token spectateur avec la même clé publique
 * RS256, sans jamais le confondre avec un token staff (pas de `role`/`perms`). */
export interface CustomerJwtPayload {
  sub: string; // customer id
  type: 'customer';
  sid: string; // customer session id
  jti: string;
  iat?: number;
  exp?: number;
}

export interface CustomerRefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}
