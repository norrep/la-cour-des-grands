import type { Niveau } from '../ia/index';

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

const CLE_SKIN = 'cour-des-grands.skin';
const memoireTexte = new Map<string, string>();

/** Le skin choisi, ou `null` s'il n'a jamais été choisi. */
export function lireSkin(): string | null {
  const m = memoireTexte.get(CLE_SKIN);
  if (m !== undefined) return m;
  try {
    return globalThis.localStorage?.getItem(CLE_SKIN) ?? null;
  } catch {
    return null;
  }
}

export function ecrireSkin(id: string): void {
  memoireTexte.set(CLE_SKIN, id);
  try {
    globalThis.localStorage?.setItem(CLE_SKIN, id);
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

const CLE_DEBUTANT = 'cour-des-grands.debutant';

/** Le joueur découvre encore le jeu (tuto pas encore passé). */
export const lireDebutant = (): boolean => lire(CLE_DEBUTANT);
export const ecrireDebutant = (oui: boolean): void => ecrire(CLE_DEBUTANT, oui);

const CLE_NIVEAU_ORDI = 'cour-des-grands.niveau-ordi';
const NIVEAUX: readonly Niveau[] = ['facile', 'moyen', 'difficile'];

/** Niveau choisi pour l'ordi (moyen par défaut). */
export function lireNiveauOrdi(): Niveau {
  let v = memoireTexte.get(CLE_NIVEAU_ORDI);
  if (v === undefined) {
    try {
      v = globalThis.localStorage?.getItem(CLE_NIVEAU_ORDI) ?? undefined;
    } catch {
      v = undefined;
    }
  }
  return NIVEAUX.includes(v as Niveau) ? (v as Niveau) : 'moyen';
}

export function ecrireNiveauOrdi(n: Niveau): void {
  memoireTexte.set(CLE_NIVEAU_ORDI, n);
  try {
    globalThis.localStorage?.setItem(CLE_NIVEAU_ORDI, n);
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

const CLE_TUTO = 'cour-des-grands.tuto-a-faire';

/** Le tutoriel jouable n'a pas encore été fini ni passé sur ce téléphone (DJ.1). */
export const lireTutoAFaire = (): boolean => lire(CLE_TUTO);
export const ecrireTutoAFaire = (oui: boolean): void => ecrire(CLE_TUTO, oui);
