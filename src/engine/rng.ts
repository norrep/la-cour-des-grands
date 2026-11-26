/**
 * Générateur aléatoire à graine (mulberry32), déterministe et sans état caché :
 * l'état tient dans un entier de 32 bits stocké dans l'état de la partie.
 */
export function tirer(etatRng: number): [valeur: number, suivant: number] {
  const suivant = (etatRng + 0x6d2b79f5) >>> 0;
  let t = suivant;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const valeur = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [valeur, suivant];
}

/** Entier dans [0, n). */
export function tirerEntier(etatRng: number, n: number): [valeur: number, suivant: number] {
  const [v, s] = tirer(etatRng);
  return [Math.floor(v * n), s];
}

/** Mélange de Fisher-Yates ; renvoie un nouveau tableau. */
export function melanger<T>(
  liste: readonly T[],
  etatRng: number,
): [resultat: T[], suivant: number] {
  const resultat = liste.slice();
  let rng = etatRng;
  for (let i = resultat.length - 1; i > 0; i--) {
    const [j, s] = tirerEntier(rng, i + 1);
    rng = s;
    const tmp = resultat[i] as T;
    resultat[i] = resultat[j] as T;
    resultat[j] = tmp;
  }
  return [resultat, rng];
}

/** Normalise une graine quelconque en état de départ. */
export function graineVersEtat(graine: number): number {
  return (Math.floor(graine) ^ 0x9e3779b9) >>> 0;
}
