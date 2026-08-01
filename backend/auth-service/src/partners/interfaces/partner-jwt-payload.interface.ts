/** Distinct de JwtPayload (staff) et CustomerJwtPayload par le claim `type` —
 * un partenaire n'a ni rôle RBAC ni compte client, juste l'identité de son
 * entreprise (module 4, Portail Partenaires / Vendeurs Externes). */
export interface PartnerJwtPayload {
  sub: string; // partner id
  type: 'partner';
  jti: string;
  iat?: number;
  exp?: number;
}
