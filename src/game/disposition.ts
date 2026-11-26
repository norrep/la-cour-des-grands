import type { Cour } from '../engine/index';
import { HAUT, LARGEUR } from './config';

/**
 * Sur un écran plus allongé que 9:16, la place gagnée en bas va surtout à la cour : le pupitre
 * descend vers le bord (en gardant une petite marge pour la barre du téléphone).
 */
export const DESCENTE = Math.round(-HAUT * 0.8);
/** De même, le bandeau du haut remonte (en laissant la place de l'encoche) et la cour avec lui. */
export const MONTEE = Math.round(HAUT * 0.55);

/** Zone de l'écran (en pixels de la résolution de base) où l'on dessine la cour. */
export const ZONE_COUR = {
  x: 40,
  y: 100 + MONTEE,
  largeur: LARGEUR - 80,
  hauteur: 940 + DESCENTE - MONTEE,
} as const;

export interface Point {
  x: number;
  y: number;
}

/** Convertit des coordonnées normalisées de la cour en pixels. */
export function versEcran(x: number, y: number): Point {
  return { x: ZONE_COUR.x + x * ZONE_COUR.largeur, y: ZONE_COUR.y + y * ZONE_COUR.hauteur };
}

export function positionNoeud(cour: Cour, id: string): Point {
  const n = cour.noeuds[id];
  if (!n) throw new Error(`Nœud inconnu : ${id}`);
  return versEcran(n.x, n.y);
}

/** Centre d'une région : la moyenne de ses îlots. */
export function centreRegion(cour: Cour, ilots: readonly string[]): Point {
  const pts = ilots.map((id) => positionNoeud(cour, id));
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

/** Le nœud le plus proche d'un point parmi des candidats, s'il est à moins de `rayon`. */
export function noeudSous(
  cour: Cour,
  candidats: Iterable<string>,
  p: Point,
  rayon: number,
): string | null {
  let meilleur: string | null = null;
  let dMin = rayon;
  for (const id of candidats) {
    const q = positionNoeud(cour, id);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= dMin) {
      dMin = d;
      meilleur = id;
    }
  }
  return meilleur;
}

export const RANG = { y: 1185 + DESCENTE, largeurCarte: 80, hauteurCarte: 140, ecart: 86 } as const;

/** Abscisse de la carte `i` sur `n` dans le rang. */
export function xCarteRang(i: number, n: number): number {
  return LARGEUR / 2 + (i - (n - 1) / 2) * RANG.ecart;
}
