import {
  adversaire,
  estPlanque,
  gouterSurveille,
  gouterSuivant,
  noeudsConnectes,
  posePossible,
  sommet,
} from '../engine/partie';
import { alleeOuverte } from '../engine/cour';
import { valeur } from '../engine/roles';
import type { Bande, EtatPartie } from '../engine/types';

/**
 * Poids de l'évaluation d'une position. Tout est générique : régions, ronde, cabanes et
 * équipements sont lus dans la cour, donc une nouvelle cour ou une règle modifiée ne demande
 * pas de toucher à l'IA, seulement, au besoin, de régler ces poids.
 */
export interface Poids {
  /** Un bon point (goûter) ramassé. */
  bonPoint: number;
  /** Goûter pas encore pris : valeur × (part des îlots tenus)^2. */
  region: number;
  /** Facteur appliqué à un goûter gardé par la surveillante (on ne peut pas le ramasser). */
  gardeSurveillante: number;
  /** Facteur pour le goûter qu'elle gardera au prochain tour complet. */
  gardeProchaine: number;
  /** Un îlot dont on tient le sommet. */
  ilot: number;
  /** Solidité d'un îlot tenu : valeur de l'élève visible / 7 (dur à plaquer). */
  solidite: number;
  /** Un élève planqué sur le banc. */
  planque: number;
  /** Chaque « pas » (pose) qui manque pour atteindre la cabane adverse. */
  distanceCabane: number;
  /** Le joueur qui a la main peut poser sur la cabane adverse : victoire presque sûre. */
  menaceAuTrait: number;
  /** L'autre joueur menace la cabane : il faudra se défendre. */
  menaceEnAttente: number;
  /** Un élève jouable dans le rang. */
  rang: number;
  /** Somme des valeurs du rang / 7. */
  forceRang: number;
  /** Un élève qui reste dans le couloir (éloigne la sonnerie). */
  couloir: number;
  /** Pénalité quand rang + couloir est presque vide (risque de sonnerie). */
  sonnerie: number;
  /** Importance de la position adverse (1 = symétrique). */
  adversaire: number;
}

export const POIDS_DEFAUT: Poids = {
  bonPoint: 120,
  region: 45,
  gardeSurveillante: 0.55,
  gardeProchaine: 0.8,
  ilot: 9,
  solidite: 7,
  planque: 10,
  distanceCabane: 14,
  menaceAuTrait: 900,
  menaceEnAttente: 90,
  rang: 40,
  forceRang: 30,
  couloir: 0.6,
  sonnerie: 40,
  adversaire: 1,
};

export const VICTOIRE = 1_000_000;

/** Coût d'entrée sur un nœud pour la bande `b` (Infinity : infranchissable). */
function cout(e: EtatPartie, b: Bande, noeud: string): number {
  const n = e.cour.noeuds[noeud];
  if (!n) return Infinity;
  if (n.type === 'cabane') return n.bande === b ? 0 : 1;
  const s = sommet(e, noeud);
  if (!s) return 1;
  if (s.bande === b) return 0;
  if (estPlanque(e, noeud)) return Infinity;
  // Un 7 adverse ne se plaque qu'avec un Petit : un peu plus cher.
  return valeur(s.role) === 7 ? 1.6 : 1;
}

/** Nombre de poses (pondéré) qu'il faut à `b` pour atteindre la cabane adverse. */
export function distanceCabane(e: EtatPartie, b: Bande): number {
  const dist: Record<string, number> = {};
  const file: string[] = [];
  for (const c of e.cour.cabanes[b]) {
    dist[c] = 0;
    file.push(c);
  }
  // Petit graphe : Bellman-Ford naïf suffit.
  let change = true;
  while (change) {
    change = false;
    for (const n of Object.keys(dist)) {
      const d = dist[n] as number;
      // On ne traverse pas la cabane adverse.
      const noeud = e.cour.noeuds[n];
      if (noeud?.type === 'cabane' && noeud.bande !== b) continue;
      for (const v of e.cour.voisins[n] ?? []) {
        if (!alleeOuverte(e.cour, v.allee, n)) continue;
        const nd = d + cout(e, b, v.noeud);
        if (nd < (dist[v.noeud] ?? Infinity)) {
          dist[v.noeud] = nd;
          change = true;
        }
      }
    }
  }
  let min = Infinity;
  for (const c of e.cour.cabanes[adversaire(b)]) min = Math.min(min, dist[c] ?? Infinity);
  return min;
}

/** La bande `b` peut-elle poser, à son prochain tour, un élève sur la cabane adverse ? */
export function menaceCabane(e: EtatPartie, b: Bande): boolean {
  const j = e.joueurs[b];
  const connectes = noeudsConnectes(e, b);
  const cabanes = e.cour.cabanes[adversaire(b)].filter((c) => connectes.has(c));
  if (cabanes.length === 0) return false;
  // L'infirmerie de `b` ne compte que si c'est à `b` de jouer (elle se vide à la fin de son tour).
  const bloques = e.courant === b ? j.infirmerie : [];
  return j.rang.some(
    (el) => !bloques.includes(el.id) && cabanes.some((c) => posePossible(e, b, el, c, connectes)),
  );
}

/** Valeur de la position pour une bande seule (sans l'adversaire). */
function valeurBande(e: EtatPartie, b: Bande, p: Poids): number {
  const j = e.joueurs[b];
  let score = j.bonsPoints * p.bonPoint;

  const garde = gouterSurveille(e);
  const prochaine = gouterSuivant(e);
  for (const r of e.cour.regions) {
    if (e.regionsPrises[r.id]) continue;
    let tenus = 0;
    let bloquee = false;
    for (const i of r.ilots) {
      const s = sommet(e, i);
      if (s?.bande === b) tenus++;
      else if (s && estPlanque(e, i)) bloquee = true;
    }
    if (bloquee || tenus === 0) continue;
    const part = tenus / r.ilots.length;
    let f = 1;
    if (r.id === garde) f = p.gardeSurveillante;
    else if (r.id === prochaine) f = p.gardeProchaine;
    // Gagner ce goûter suffirait pour l'emporter : il compte plus.
    const decisif = j.bonsPoints + r.bonsPoints >= e.cour.seuilBonsPoints ? 1.6 : 1;
    score += p.region * r.bonsPoints * part * part * f * decisif;
  }

  for (const i of e.cour.ilots) {
    const s = sommet(e, i);
    if (s?.bande !== b) continue;
    score += p.ilot;
    const v = valeur(s.role);
    score += p.solidite * ((v ?? 0) / 7);
    if (estPlanque(e, i)) score += p.planque;
  }

  const d = distanceCabane(e, b);
  score -= p.distanceCabane * Math.min(d, 6);

  const jouables = j.rang.filter((el) => !(e.courant === b && j.infirmerie.includes(el.id)));
  score += p.rang * jouables.length;
  score += (p.forceRang * jouables.reduce((t, el) => t + (valeur(el.role) ?? 3.5), 0)) / 7;
  score += p.couloir * j.couloir.length;
  const reserve = j.rang.length + j.couloir.length;
  if (reserve < 4) score -= p.sonnerie * (4 - reserve);

  return score;
}

/** Évalue la position du point de vue de `b` (plus c'est grand, mieux c'est pour `b`). */
export function evaluer(e: EtatPartie, b: Bande, p: Poids = POIDS_DEFAUT): number {
  if (e.fin) {
    // Gagner tôt vaut mieux, perdre tard aussi.
    return e.fin.gagnant === b ? VICTOIRE - e.tour : -VICTOIRE + e.tour;
  }
  const adv = adversaire(b);
  let score = valeurBande(e, b, p) - p.adversaire * valeurBande(e, adv, p);
  const trait = e.courant;
  const autre = adversaire(trait);
  if (menaceCabane(e, trait)) score += (trait === b ? 1 : -1) * p.menaceAuTrait;
  if (menaceCabane(e, autre)) score += (autre === b ? 1 : -1) * p.menaceEnAttente;
  return score;
}
