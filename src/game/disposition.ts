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
  // Descendue de 40 px (DF.19) : la cabane du haut ne passe plus sous le bandeau.
  y: 140 + MONTEE,
  largeur: LARGEUR - 80,
  // La cour descend jusqu'au bouton d'appel : plus de feuille de cahier en bas (DF.14).
  hauteur: 955 + DESCENTE - MONTEE,
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

/**
 * Le rang en bas de l'écran. Cartes grandes (DL.1) : sur un téléphone de 360 dp, une carte fait
 * 61 × 95 dp, assez pour reconnaître l'élève et le viser du doigt.
 */
export const RANG = {
  y: 1166 + DESCENTE,
  largeurCarte: 122,
  hauteurCarte: 190,
  ecart: 120,
} as const;

/** Largeur que le rang peut occuper (centres de la première à la dernière carte). */
const ETENDUE_RANG = 570;

/** Partie de l'écran où s'étale la main : centre et étendue (centres de la première à la dernière). */
export interface ZoneMain {
  centre: number;
  etendue: number;
}

const ZONE_MAIN: ZoneMain = { centre: LARGEUR / 2, etendue: ETENDUE_RANG };

/** Abscisse de la carte `i` sur `n` dans le rang : au-delà de 6 cartes, elles se chevauchent. */
export function xCarteRang(i: number, n: number, zone: ZoneMain = ZONE_MAIN): number {
  const ecart = n > 1 ? Math.min(RANG.ecart, zone.etendue / (n - 1)) : RANG.ecart;
  return zone.centre + (i - (n - 1) / 2) * ecart;
}

/**
 * Place de la carte `i` sur `n` dans le rang, tenu en léger éventail (demande de Clément) : les
 * cartes s'inclinent vers l'extérieur et les bords descendent un peu, comme dans une main.
 */
export function poseCarteRang(
  i: number,
  n: number,
  zone: ZoneMain = ZONE_MAIN,
): { x: number; y: number; rotation: number } {
  const t = i - (n - 1) / 2;
  const demi = Math.max(1, (n - 1) / 2);
  return {
    x: xCarteRang(i, n, zone),
    y: RANG.y + t * t * Math.min(4, 14 / (demi * demi)),
    rotation: t * Math.min(0.055, 0.15 / demi),
  };
}

/** Les lieux d'une bande autour de sa cabane : son portail (le couloir) et son bureau de CPE. */
export type Lieu = 'portail' | 'cpe';

/**
 * Écart horizontal entre la cabane et ses lieux. Pioche et punis sont côte à côte, à gauche de la
 * cabane (DL.9, essai demandé par Clément) : la droite reste libre pour le rond « +2 copains ».
 */
const ECARTS_LIEUX: Record<Lieu, number> = { portail: 265, cpe: 140 };
/** Piscine : les îlots des bords sont plus écartés, les lieux vont vers le bord (DP.9, DP.10). */
const ECARTS_LIEUX_PISCINE: Record<Lieu, number> = { portail: 295, cpe: 172 };

/** Centre d'un lieu : à gauche de la cabane de la bande, la pioche au bord, les punis à côté. */
export function positionLieu(cour: Cour, bande: 'rouge' | 'bleu', lieu: Lieu): Point {
  const cabane = cour.cabanes[bande][0];
  const c = cabane ? positionNoeud(cour, cabane) : { x: LARGEUR / 2, y: ZONE_COUR.y };
  // En bas (bande rouge), on remonte un peu pour laisser la place au journal.
  const dy = bande === 'rouge' ? -22 : 14;
  const ecart = (cour.id === 'piscine' ? ECARTS_LIEUX_PISCINE : ECARTS_LIEUX)[lieu];
  return { x: c.x - ecart, y: c.y + dy };
}
