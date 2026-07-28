export interface DecodedAccessToken {
  sub: string;
  role: string;
  perms: string[];
  sid: string;
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Décodage local uniquement (lecture des claims pour l'affichage/gating UI).
 * Ne remplace jamais la vérification de signature RS256 faite côté serveur
 * à chaque requête — un token altéré échouera simplement sur l'API.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as DecodedAccessToken;
  } catch {
    return null;
  }
}

export function isExpired(exp: number): boolean {
  return Date.now() >= exp * 1000;
}
