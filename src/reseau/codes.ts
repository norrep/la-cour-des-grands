/**
 * Codes d'invitation : 6 lettres faciles à dicter au téléphone ou à recopier.
 * Pas de I, L, O, Q, U ni W (confondus entre eux ou avec 1, 0, V), pas de chiffres. 20 lettres sur 6 places :
 * 64 millions de codes, assez pour que deux parties ouvertes en même temps ne se croisent pas.
 */
export const ALPHABET_CODE = 'ABCDEFGHJKMNPRSTVXYZ';
export const LONGUEUR_CODE = 6;

/** Un code tiré au hasard. `hasard` rend un entier de 32 bits (crypto côté serveur). */
export function nouveauCode(hasard: () => number): string {
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE; i++) {
    code += ALPHABET_CODE[(hasard() >>> 0) % ALPHABET_CODE.length];
  }
  return code;
}

/** Remet en forme un code tapé ou collé (minuscules, espaces, tirets), ou `null` s'il est faux. */
export function normaliserCode(saisie: string): string | null {
  const code = saisie.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== LONGUEUR_CODE) return null;
  for (const c of code) if (!ALPHABET_CODE.includes(c)) return null;
  return code;
}
