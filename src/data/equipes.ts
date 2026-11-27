/**
 * Les équipes (DB.1) : un look, jamais une règle. Le moteur ne connaît que deux camps, `rouge`
 * (en bas) et `bleu` (en haut) ; avant chaque partie, chaque camp reçoit une équipe, qui décide
 * de ses couleurs, de ses élèves dessinés et de son nom à l'écran.
 */
import type { Bande } from '../engine/index';

export type EquipeId = 'rouges' | 'bleus' | 'vers' | 'aliens';

export interface Equipe {
  id: EquipeId;
  /** Nom affiché sur l'écran de choix. */
  nom: string;
  /** « bande rouge », « bande des Vers » : se lit après « la ». */
  bande: string;
  /** Adjectif court, pour une pile ou un score : « rouge », « ver ». */
  court: string;
  /** Couleur de l'équipe (liseré des pastilles, chemin, cabane). */
  couleur: number;
  /** Fond clair des pastilles. */
  clair: number;
  /** Préfixe des images des élèves (`public/skins/dodu/<prefixe>-<rôle>.png`). */
  prefixe: string;
  /** Ver de terre : pas de bras, on l'attrape par la tête. */
  sansBras?: boolean;
}

export const EQUIPES: Record<EquipeId, Equipe> = {
  rouges: {
    id: 'rouges',
    nom: 'Les Rouges',
    bande: 'bande rouge',
    court: 'rouge',
    couleur: 0xf0705f,
    clair: 0xffd2c8,
    prefixe: 'rouge',
  },
  bleus: {
    id: 'bleus',
    nom: 'Les Bleus',
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
  aliens: {
    id: 'aliens',
    nom: 'Les Aliens',
    bande: 'bande des Aliens',
    court: 'alien',
    couleur: 0x9a6ad6,
    clair: 0xe6d8f7,
    prefixe: 'aliens',
  },
};

export const ORDRE_EQUIPES: readonly EquipeId[] = ['rouges', 'bleus', 'vers', 'aliens'];

let choix: Record<Bande, EquipeId> = { rouge: 'rouges', bleu: 'bleus' };

/** Donne une équipe à chaque camp pour la partie qui commence. */
export function choisirEquipes(c: Record<Bande, EquipeId>): void {
  choix = { ...c };
}

/** L'équipe qui joue le camp `bande` dans la partie en cours. */
export function equipeDe(bande: Bande): Equipe {
  return EQUIPES[choix[bande]];
}

export function equipesEnJeu(): Record<Bande, EquipeId> {
  return { ...choix };
}
