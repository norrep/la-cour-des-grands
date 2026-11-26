/** Préférences gardées sur le téléphone. Sans stockage (navigation privée…), on les garde en mémoire. */
const memoire = new Map<string, boolean>();

function lire(cle: string): boolean {
  const m = memoire.get(cle);
  if (m !== undefined) return m;
  try {
    return globalThis.localStorage?.getItem(cle) !== 'non';
  } catch {
    return true;
  }
}

function ecrire(cle: string, oui: boolean): void {
  memoire.set(cle, oui);
  try {
    globalThis.localStorage?.setItem(cle, oui ? 'oui' : 'non');
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

const CLE_CONSEILS = 'cour-des-grands.conseils';
const CLE_SONS = 'cour-des-grands.sons';

export const lireConseils = (): boolean => lire(CLE_CONSEILS);
export const ecrireConseils = (oui: boolean): void => ecrire(CLE_CONSEILS, oui);
export const lireSons = (): boolean => lire(CLE_SONS);
export const ecrireSons = (oui: boolean): void => ecrire(CLE_SONS, oui);
