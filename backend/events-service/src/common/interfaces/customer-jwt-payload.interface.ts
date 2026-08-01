export interface CustomerJwtPayload {
  sub: string; // customer id
  type: 'customer';
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}
