import { actionsLegales, jouer, BANDES } from './partie';
import { TAILLE_RANG } from './roles';
import { graineVersEtat, tirerEntier } from './rng';
import type { Action, Bande, Cour, EtatPartie, RaisonFin } from './types';

/** Choisit une action légale au hasard (générateur à graine propre au joueur aléatoire). */
export function actionAleatoire(e: EtatPartie, rng: number): [Action, number] {
  const actions = actionsLegales(e);
  if (actions.length === 0) throw new Error('Aucune action légale alors que la partie continue.');
  const [i, suivant] = tirerEntier(rng, actions.length);
  return [actions[i] as Action, suivant];
}

/** Vérifie les invariants de l'état ; lève une erreur au premier problème trouvé. */
export function verifierInvariants(e: EtatPartie): void {
  for (const b of BANDES) {
    const j = e.joueurs[b];
    if (j.rang.length > TAILLE_RANG) throw new Error(`Rang ${b} trop grand : ${j.rang.length}`);
    let total = j.couloir.length + j.rang.length + j.cpe.length + j.absents.length;
    for (const pile of Object.values(e.piles)) total += pile.filter((el) => el.bande === b).length;
    // Un élève posé sur la cabane adverse quitte le rang sans rejoindre de pile.
    const surCabane = e.fin?.raison === 'cabane' && e.fin.gagnant === b ? 1 : 0;
    if (total + surCabane !== 24) throw new Error(`La bande ${b} compte ${total} élèves`);
    for (const id of j.infirmerie) {
      if (!j.rang.some((el) => el.id === id)) throw new Error(`Infirmerie hors du rang : ${id}`);
    }
  }
  const ids = new Set<string>();
  for (const b of BANDES) {
    const j = e.joueurs[b];
    for (const el of [...j.couloir, ...j.rang, ...j.cpe, ...j.absents]) {
      if (ids.has(el.id)) throw new Error(`Élève en double : ${el.id}`);
      ids.add(el.id);
    }
  }
  for (const pile of Object.values(e.piles)) {
    for (const el of pile) {
      if (ids.has(el.id)) throw new Error(`Élève en double : ${el.id}`);
      ids.add(el.id);
    }
  }
}

export interface ResultatPartie {
  gagnant: Bande;
  raison: RaisonFin;
  premier: Bande;
  tours: number;
  actions: number;
}

/** Joue une partie complète au hasard. */
export function partieAleatoire(
  creer: () => EtatPartie,
  graineJoueur: number,
  options: { invariants?: boolean; maxActions?: number } = {},
): ResultatPartie {
  let e = creer();
  let rng = graineVersEtat(graineJoueur);
  let n = 0;
  const max = options.maxActions ?? 5000;
  while (!e.fin) {
    if (++n > max) throw new Error(`Partie sans fin après ${max} actions`);
    const [action, suivant] = actionAleatoire(e, rng);
    rng = suivant;
    e = jouer(e, action);
    if (options.invariants) verifierInvariants(e);
  }
  return {
    gagnant: e.fin.gagnant,
    raison: e.fin.raison,
    premier: e.premier,
    tours: e.tour,
    actions: n,
  };
}

export interface Statistiques {
  parties: number;
  erreurs: { graine: number; message: string }[];
  victoires: Record<Bande, number>;
  victoiresPremier: number;
  victoiresSecond: number;
  raisons: Record<RaisonFin, number>;
  toursMoyens: number;
  toursMin: number;
  toursMax: number;
}

export function simuler(
  cour: Cour,
  parties: number,
  graine: number,
  creerPartie: (cour: Cour, graine: number) => EtatPartie,
  invariants = true,
): Statistiques {
  const stats: Statistiques = {
    parties,
    erreurs: [],
    victoires: { rouge: 0, bleu: 0 },
    victoiresPremier: 0,
    victoiresSecond: 0,
    raisons: { cabane: 0, bonsPoints: 0, sonnerie: 0 },
    toursMoyens: 0,
    toursMin: Infinity,
    toursMax: 0,
  };
  let somme = 0;
  for (let i = 0; i < parties; i++) {
    const g = graine + i;
    try {
      const r = partieAleatoire(() => creerPartie(cour, g), g * 7919 + 13, { invariants });
      stats.victoires[r.gagnant]++;
      if (r.gagnant === r.premier) stats.victoiresPremier++;
      else stats.victoiresSecond++;
      stats.raisons[r.raison]++;
      somme += r.tours;
      stats.toursMin = Math.min(stats.toursMin, r.tours);
      stats.toursMax = Math.max(stats.toursMax, r.tours);
    } catch (err) {
      stats.erreurs.push({ graine: g, message: err instanceof Error ? err.message : String(err) });
    }
  }
  const terminees = parties - stats.erreurs.length;
  stats.toursMoyens = terminees > 0 ? somme / terminees : 0;
  return stats;
}
