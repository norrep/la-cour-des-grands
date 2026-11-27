import { actionsLegales } from '../engine/partie';
import { tirer, tirerEntier } from '../engine/rng';
import type { Action, Bande, EtatPartie } from '../engine/types';
import { actionsIA, cleAction, coupsDuTour, type Coup } from './coups';
import { evaluer, POIDS_DEFAUT, VICTOIRE, type Poids } from './evaluation';
import { determiniser } from './information';

/** Réglages d'un joueur IA. Les niveaux de difficulté sont des réglages tout faits. */
export interface ConfigIA {
  nom: string;
  /** 1 : regarde son propre tour ; 2 : regarde aussi la meilleure réponse adverse. */
  profondeur: 1 | 2;
  /** Nombre de mondes possibles (cartes cachées tirées au hasard) sur lesquels on moyenne. */
  determinisations: number;
  /** Profondeur 2 : nombre de coups examinés en détail (les meilleurs à profondeur 1). */
  largeur: number;
  /** Bruit ajouté au score de chaque coup (plus c'est grand, plus l'IA se trompe). */
  bruit: number;
  /** Probabilité de jouer un coup au hasard. */
  erreur: number;
  /** Nombre maximum de tours complets énumérés par position. */
  limiteCoups: number;
  poids: Poids;
}

export const NIVEAUX = {
  /** Joue n'importe quel coup permis : la référence la plus basse, pour l'arène. */
  hasard: {
    nom: 'hasard',
    profondeur: 1,
    determinisations: 1,
    largeur: 1,
    bruit: 0,
    erreur: 1,
    limiteCoups: 1,
    poids: POIDS_DEFAUT,
  },
  facile: {
    nom: 'facile',
    profondeur: 1,
    determinisations: 1,
    largeur: 1,
    bruit: 70,
    erreur: 0.2,
    limiteCoups: 300,
    // Ne voit pas venir les attaques de cabane.
    poids: { ...POIDS_DEFAUT, menaceAuTrait: 0, menaceEnAttente: 0, distanceCabane: 3 },
  },
  moyen: {
    nom: 'moyen',
    profondeur: 1,
    determinisations: 3,
    largeur: 1,
    bruit: 10,
    erreur: 0,
    limiteCoups: 400,
    poids: POIDS_DEFAUT,
  },
  difficile: {
    nom: 'difficile',
    profondeur: 2,
    determinisations: 4,
    largeur: 6,
    bruit: 0,
    erreur: 0,
    limiteCoups: 400,
    poids: POIDS_DEFAUT,
  },
} satisfies Record<string, ConfigIA>;

export type Niveau = keyof typeof NIVEAUX;

/** Valeur d'un tour complet pour `b`, en regardant (profondeur 2) la meilleure réponse adverse. */
function valeurCoup(c: Coup, b: Bande, config: ConfigIA, profondeur: number): number {
  const e = c.etat;
  if (profondeur <= 1 || e.fin) return evaluer(e, b, config.poids);
  let pire = Infinity;
  for (const r of coupsDuTour(e, config.limiteCoups)) {
    const v = evaluer(r.etat, b, config.poids);
    if (v < pire) pire = v;
    // L'adversaire gagne : inutile de chercher plus loin.
    if (pire <= -VICTOIRE / 2) break;
  }
  return pire === Infinity ? evaluer(e, b, config.poids) : pire;
}

/** Pour chaque première action, ses tours complets du meilleur au moins bon (profondeur 1). */
type Tours = Map<string, { c: Coup; v: number }[]>;

/**
 * Notes moyennes de chaque première action possible (clé → note), sur plusieurs mondes.
 * Profondeur 2 : les `largeur` premières actions les mieux notées à profondeur 1 sont
 * revues en regardant la meilleure réponse adverse (sur leurs 3 meilleurs tours).
 */
export function noterActions(
  etat: EtatPartie,
  config: ConfigIA,
  rng: number,
): [Map<string, number>, number] {
  const b = etat.courant;
  let r = rng;
  const n = Math.max(1, config.determinisations);
  const mondes: Tours[] = [];
  const notes1 = new Map<string, number>();
  for (let k = 0; k < n; k++) {
    const [monde, s] = determiniser(etat, b, r);
    r = s;
    const tours: Tours = new Map();
    for (const c of coupsDuTour(monde, config.limiteCoups)) {
      const cle = cleAction(monde, c.actions[0] as Action);
      const liste = tours.get(cle) ?? [];
      liste.push({ c, v: evaluer(c.etat, b, config.poids) });
      tours.set(cle, liste);
    }
    for (const [cle, liste] of tours) {
      liste.sort((x, y) => y.v - x.v);
      notes1.set(cle, (notes1.get(cle) ?? 0) + (liste[0] as { v: number }).v / n);
    }
    mondes.push(tours);
  }
  if (config.profondeur < 2) return [notes1, r];

  const retenues = [...notes1.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, Math.max(1, config.largeur))
    .map(([cle]) => cle);
  const notes2 = new Map<string, number>();
  for (const tours of mondes) {
    for (const cle of retenues) {
      const liste = tours.get(cle) ?? [];
      let best = -Infinity;
      for (const { c } of liste.slice(0, 3)) best = Math.max(best, valeurCoup(c, b, config, 2));
      notes2.set(cle, (notes2.get(cle) ?? 0) + best / n);
    }
  }
  return [notes2, r];
}

/**
 * Choisit la prochaine action du joueur courant. À appeler à chaque fois que c'est à l'IA
 * d'agir (un tour peut demander plusieurs actions : pose, puis choix d'un pouvoir…) ; le tour
 * entier est recalculé à chaque fois depuis l'état réel.
 * L'IA ne lit jamais les cartes cachées : elle raisonne sur des mondes tirés au hasard.
 * `rng` est le générateur propre à l'IA (indépendant de celui de la partie).
 */
export function choisirAction(
  etat: EtatPartie,
  config: ConfigIA | Niveau,
  rng: number,
): [Action, number] {
  const cfg = typeof config === 'string' ? NIVEAUX[config] : config;
  const candidates = actionsIA(etat);
  if (candidates.length === 0) {
    const repli = actionsLegales(etat)[0];
    if (!repli) throw new Error('Aucune action possible pour l’IA.');
    return [repli, rng];
  }
  let r = rng;
  if (candidates.length === 1) return [candidates[0] as Action, r];

  if (cfg.erreur > 0) {
    const [v, s] = tirer(r);
    r = s;
    if (v < cfg.erreur) {
      const [i, s2] = tirerEntier(r, candidates.length);
      return [candidates[i] as Action, s2];
    }
  }

  const [notes, s] = noterActions(etat, cfg, r);
  r = s;
  let meilleure = candidates[0] as Action;
  let max = -Infinity;
  for (const a of candidates) {
    let v = notes.get(cleAction(etat, a)) ?? -Infinity;
    if (cfg.bruit > 0 && v > -VICTOIRE / 2 && v < VICTOIRE / 2) {
      const [u, s2] = tirer(r);
      const [w, s3] = tirer(s2);
      r = s3;
      v += (u + w - 1) * cfg.bruit;
    }
    if (v > max) {
      max = v;
      meilleure = a;
    }
  }
  return [meilleure, r];
}
