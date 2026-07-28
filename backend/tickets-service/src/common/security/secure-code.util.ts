import { randomBytes } from 'crypto';

/**
 * "Checksum Mode 4" : algorithme de somme de contrôle maison à 4 poids
 * cycliques (1, 3, 7, 9), inspiré des familles Luhn/EAN. Objectif : détecter
 * quasi-systématiquement toute altération manuelle d'un caractère du code
 * (billet falsifié/modifié) sans dépendre d'un service externe — la
 * vérification reste possible hors-ligne (tourniquets, module 6).
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans 0/O/1/I : évite les confusions à la lecture
const WEIGHTS = [1, 3, 7, 9];
const BASE_LENGTH = 12;
const CHECKSUM_LENGTH = 2;

function computeChecksum(base: string): string {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const value = ALPHABET.indexOf(base[i]);
    const weight = WEIGHTS[i % WEIGHTS.length];
    sum += (value < 0 ? 0 : value) * weight;
  }
  const c1 = ALPHABET[sum % ALPHABET.length];
  const c2 = ALPHABET[(sum * 7) % ALPHABET.length];
  return `${c1}${c2}`;
}

/** Génère un nouveau code sécurisé unique : base aléatoire + checksum Mode 4. */
export function generateSecureCode(): { code: string; checksum: string } {
  const bytes = randomBytes(BASE_LENGTH);
  let base = '';
  for (let i = 0; i < BASE_LENGTH; i++) {
    base += ALPHABET[bytes[i] % ALPHABET.length];
  }
  const checksum = computeChecksum(base);
  return { code: `${base}${checksum}`, checksum };
}

/** Vérifie qu'un code n'a pas été altéré : recalcule le checksum et le compare. */
export function verifySecureCode(fullCode: string): boolean {
  if (fullCode.length !== BASE_LENGTH + CHECKSUM_LENGTH) return false;
  const base = fullCode.slice(0, BASE_LENGTH);
  const checksum = fullCode.slice(BASE_LENGTH);
  return computeChecksum(base) === checksum;
}
