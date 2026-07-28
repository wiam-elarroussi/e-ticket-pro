export interface JwtPayload {
  sub: string; // user id
  role: string; // code du rôle (ex: ADMIN, OPERATEUR...)
  perms: string[]; // snapshot des permissions effectives au moment de l'émission
  sid: string; // session id (table sessions)
  jti: string; // identifiant unique du token, utilisé pour la blacklist Redis
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}
