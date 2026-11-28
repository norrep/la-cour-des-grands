/**
 * Les équipes (DB.1, DE.1) : un look, et un rôle signature (DS.1) qui remplace un des 8 rôles.
 * Le moteur ne connaît que deux camps, `rouge` (en bas) et `bleu` (en haut) ; avant chaque
 * partie, chaque camp reçoit une équipe.
 *
 * Une équipe n'a qu'UNE couleur à l'écran (sa tenue). Elle garde une seconde tenue, jamais
 * montrée au choix, qui ne sert que si les deux camps prennent la même équipe (match miroir) :
 * le camp du haut l'enfile alors pour qu'on distingue les deux bandes.
 */
import type { Bande, RoleId } from '../engine/index';

/** Une tenue : la couleur et les dessins d'une équipe sur la cour. */
export type TenueId = 'rouges' | 'bleus' | 'vers' | 'vers2' | 'aliens' | 'aliens2';

export interface Tenue {
  id: TenueId;
  /** Nom de la bande en jeu (score, fin de partie). */
  nom: string;
  /** « bande rouge », « bande des Vers » : se lit après « la » (court, pour le journal). */
  bande: string;
  /** Adjectif court, pour une pile : « rouge », « ver ». */
  court: string;
  /** Couleur de la tenue (liseré des pastilles, chemin, cabane). */
  couleur: number;
  /** Fond clair des pastilles. */
  clair: number;
  /** Préfixe des images des élèves (`public/skins/dodu/<prefixe>-<rôle>.png`). */
  prefixe: string;
  /** Préfixe des attaches de la marionnette, si elles viennent d'une autre tenue (même dessin). */
  rig?: string;
  /** Ver de terre : pas de bras, on l'attrape par la tête. */
  sansBras?: boolean;
}

export const TENUES: Record<TenueId, Tenue> = {
  rouges: {
    id: 'rouges',
    nom: 'Les Écoliers',
    bande: 'bande rouge',
    court: 'rouge',
    couleur: 0xf0705f,
    clair: 0xffd2c8,
    prefixe: 'rouge',
  },
  bleus: {
    id: 'bleus',
    nom: 'Les Écoliers bleus',
    bande: 'bande bleue',
    court: 'bleu',
    couleur: 0x6f84de,
    clair: 0xd5dcff,
    prefixe: 'bleu',
  },
  vers: {
    id: 'vers',
    nom: 'Les Vers de terre',
    bande: 'bande des Vers',
    court: 'ver',
    couleur: 0xd9a52b,
    clair: 0xfbe7b0,
    prefixe: 'vers',
    sansBras: true,
  },
  vers2: {
    id: 'vers2',
    nom: 'Les Vers turquoise',
    bande: 'bande des Vers turquoise',
    court: 'ver turquoise',
    couleur: 0x2fb5b5,
    clair: 0xc4f1ef,
    prefixe: 'vers2',
    rig: 'vers',
    sansBras: true,
  },
  aliens: {
    id: 'aliens',
    nom: 'Les Aliens',
    bande: 'bande des Aliens',
    court: 'alien',
    couleur: 0x9a6ad6,
    clair: 0xe6d8f7,
    prefixe: 'aliens',
  },
  aliens2: {
    id: 'aliens2',
    nom: 'Les Aliens orange',
    bande: 'bande des Aliens orange',
    court: 'alien orange',
    couleur: 0xee8a45,
    clair: 0xffdcc2,
    prefixe: 'aliens2',
    rig: 'aliens',
  },
};

/** Ce qu'on choisit avant la partie. */
export type EquipeId = 'ecoliers' | 'vers' | 'aliens';

export interface Equipe {
  id: EquipeId;
  /** Nom affiché sur l'écran de choix. */
  nom: string;
  /** La tenue de l'équipe, la seule montrée au choix. */
  tenue: TenueId;
  /** Seconde tenue, cachée : seulement si l'autre camp a pris la même équipe. */
  miroir: TenueId;
  /** Rôle signature du clan (DS.1), à la place d'un des 8 rôles ; aucun : les 8 rôles d'origine. */
  signature?: RoleId;
}

export const EQUIPES: Record<EquipeId, Equipe> = {
  ecoliers: {
    id: 'ecoliers',
    nom: 'Les Écoliers',
    tenue: 'rouges',
    miroir: 'bleus',
    signature: 'bagarreur',
  },
  // Les Vers gardent leurs 8 rôles : le Fouisseur n'a pas pu être équilibré (DS.4).
  vers: { id: 'vers', nom: 'Les Vers de terre', tenue: 'vers', miroir: 'vers2' },
  aliens: {
    id: 'aliens',
    nom: 'Les Aliens',
    tenue: 'aliens',
    miroir: 'aliens2',
    signature: 'teleporteur',
  },
};

/** Le rôle signature de chaque camp, pour le moteur (`OptionsPartie.signatures`). */
export function signaturesPour(c: Record<Bande, EquipeId>): Partial<Record<Bande, RoleId>> {
  const s: Partial<Record<Bande, RoleId>> = {};
  for (const b of ['rouge', 'bleu'] as const) {
    const r = EQUIPES[c[b]]?.signature;
    if (r) s[b] = r;
  }
  return s;
}

export const ORDRE_EQUIPES: readonly EquipeId[] = ['ecoliers', 'vers', 'aliens'];

/** Les tenues de la partie : le camp du haut passe en tenue miroir si les équipes sont les mêmes. */
export function tenuesPour(c: Record<Bande, EquipeId>): Record<Bande, TenueId> {
  const haut = EQUIPES[c.bleu];
  return {
    rouge: EQUIPES[c.rouge].tenue,
    bleu: c.bleu === c.rouge ? haut.miroir : haut.tenue,
  };
}

let choix: Record<Bande, TenueId> = { rouge: 'rouges', bleu: 'bleus' };

/** Donne une équipe à chaque camp pour la partie qui commence. */
export function choisirEquipes(c: Record<Bande, EquipeId>): void {
  choix = tenuesPour(c);
}

/** La tenue que porte le camp `bande` dans la partie en cours. */
export function equipeDe(bande: Bande): Tenue {
  return TENUES[choix[bande]];
}
