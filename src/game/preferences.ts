/** Préférences gardées sur le téléphone. Sans stockage (navigation privée…), on les garde en mémoire. */
const CLE_CONSEILS = 'cour-des-grands.conseils';
let conseilsEnMemoire: boolean | null = null;

export function lireConseils(): boolean {
  if (conseilsEnMemoire !== null) return conseilsEnMemoire;
  try {
    return globalThis.localStorage?.getItem(CLE_CONSEILS) !== 'non';
  } catch {
    return true;
  }
}

export function ecrireConseils(actifs: boolean): void {
  conseilsEnMemoire = actifs;
  try {
    globalThis.localStorage?.setItem(CLE_CONSEILS, actifs ? 'oui' : 'non');
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}
