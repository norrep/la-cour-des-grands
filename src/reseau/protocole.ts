/**
 * Le jeu en ligne : ce qui circule entre les téléphones et le serveur.
 *
 * Le serveur est l'arbitre (voir `arbitre.ts`) : il garde l'état complet de la partie, applique
 * les règles avec le même moteur que le jeu, et n'envoie à chaque joueur qu'une VUE de la partie,
 * où ce qu'il n'a pas le droit de savoir est caché (voir `vue.ts`). Un téléphone ne peut donc ni
 * jouer à la place de l'autre, ni tricher en lisant la main ou la pioche adverse.
 *
 * Ce module est pur (ni Phaser, ni réseau) : il tourne aussi bien dans le navigateur, dans les
 * tests que dans la fonction serveur.
 */
import type { Action, Bande, EtatPartie, RaisonFin } from '../engine/index';
import type { EquipeId } from '../data/equipes';

/** Où en est une partie en ligne. */
export type Statut = 'attente' | 'en_cours' | 'finie';

/** Comment une partie en ligne se termine : par les règles, ou hors des règles. */
export type RaisonIssue = RaisonFin | 'abandon' | 'temps';

export interface Issue {
  gagnant: Bande;
  raison: RaisonIssue;
}

/** Ce que l'hôte choisit en créant la partie. */
export interface ReglagesEnLigne {
  /** Id de la carte (une clé de `COURS`). */
  carte: string;
  equipements: boolean;
  /** L'équipe de chaque camp (le look seulement). */
  equipes: Record<Bande, EquipeId>;
  /** Temps laissé pour jouer un tour, en secondes (au-delà, la partie est perdue). */
  delaiTour: number;
}

/** L'état d'une partie, prêt à être stocké : sans la cour, retrouvée par son id. */
export type EtatStocke = Omit<EtatPartie, 'cour'> & { courId: string };

/** Une partie telle que le serveur la garde. Jamais envoyée telle quelle à un joueur. */
export interface PartieServeur {
  id: string;
  /** Code d'invitation (6 lettres), à partager avec l'ami. */
  code: string;
  reglages: ReglagesEnLigne;
  statut: Statut;
  /** Le compte qui joue chaque camp. L'hôte prend le rouge, l'invité le bleu. */
  joueurs: Partial<Record<Bande, string>>;
  /** `null` tant que l'invité n'est pas arrivé. */
  etat: EtatStocke | null;
  /** Augmente à chaque changement : un coup envoyé sur une version périmée est refusé. */
  version: number;
  issue: Issue | null;
  /** Heure limite (ms depuis 1970) pour jouer le tour en cours, `null` hors partie. */
  echeance: number | null;
  creeLe: number;
  majLe: number;
  /** Le pseudo de chaque joueur, pris au moment où il entre dans la partie. */
  noms?: Partial<Record<Bande, string>>;
}

/** Ce qu'un joueur reçoit : la partie vue de son camp. */
export interface VueJoueur {
  id: string;
  code: string;
  version: number;
  reglages: ReglagesEnLigne;
  statut: Statut;
  /** Le camp de ce joueur. */
  bande: Bande;
  /** L'adversaire a rejoint la partie. */
  adversairePresent: boolean;
  /** L'état vu de ce camp (voir `vue.ts`), `null` tant que la partie n'a pas commencé. */
  etat: EtatStocke | null;
  issue: Issue | null;
  echeance: number | null;
  /** Le pseudo de l'adversaire, s'il en a un. */
  adversaire?: string | null;
}

/** Le profil d'un joueur : son pseudo et le code à donner à ses amis. */
export interface Profil {
  id: string;
  pseudo: string;
  codeAmi: string;
}

/** Un ami de la liste (on devient amis en jouant ensemble, ou avec le code ami). */
export type Ami = Profil;

/** Un ami a ouvert une partie pour nous et nous attend. */
export interface Invitation {
  partieId: string;
  /** Le code de la partie, pour la rejoindre. */
  code: string;
  /** L'ami qui invite. */
  de: string;
  pseudo: string;
  carte: string;
  /** Heure d'envoi (ms depuis 1970). */
  creeLe: number;
}

/** Ce qu'un joueur peut demander au serveur pendant une partie. */
export type Demande =
  | { type: 'jouer'; action: Action; version: number }
  | { type: 'abandonner' }
  /**
   * L'heure limite du tour est passée : la partie est close (gagnée par celui qui attendait).
   * L'un ou l'autre joueur peut le demander, par exemple en rouvrant le jeu.
   */
  | { type: 'reclamer' };

/** Les refus possibles, à traduire en phrases à l'écran. */
export type CodeRefus =
  | 'partie_introuvable'
  | 'pas_joueur'
  | 'partie_pleine'
  | 'deja_dedans'
  | 'pas_commencee'
  | 'finie'
  | 'pas_ton_tour'
  | 'version_perimee'
  | 'coup_illegal'
  | 'pas_encore'
  | 'reglages_invalides'
  | 'pseudo_invalide'
  | 'ami_introuvable'
  | 'soi_meme'
  | 'pas_ami'
  /** Le serveur refuse les connexions sans compte (réglage du projet). */
  | 'connexion_fermee';

export class Refus extends Error {
  constructor(
    readonly code: CodeRefus,
    message: string = code,
  ) {
    super(message);
  }
}
