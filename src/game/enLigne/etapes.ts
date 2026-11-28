import type { EquipeId } from '../../data/equipes';
import type { VueJoueur } from '../../reseau/index';

/** L'ami de la liste à qui l'on propose la partie. */
export interface AmiInvite {
  id: string;
  pseudo: string;
}

/** Où en est le joueur dans le chemin du jeu en ligne (passé d'un écran à l'autre). */
export type EtapeEnLigne =
  /** Le menu : inviter, rejoindre par code, reprendre. */
  | { etape: 'menu'; message?: string }
  /**
   * L'hôte choisit la carte et sa bande (écran de choix), puis ouvre la partie. Avec `ami`, la
   * partie est proposée à cet ami de la liste.
   */
  | { etape: 'hote'; ami?: AmiInvite }
  /** La partie est ouverte : le code s'affiche, on attend l'ami. */
  | { etape: 'ouvrir'; ami?: AmiInvite }
  /** La liste d'amis. */
  | { etape: 'amis' }
  /** Taper le code reçu. */
  | { etape: 'code' }
  /** L'invité choisit sa bande (écran de choix), puis rejoint. */
  | { etape: 'invite'; code: string }
  | { etape: 'rejoindre'; code: string; equipe: EquipeId }
  | { etape: 'reprendre'; partieId: string }
  /** La partie se joue. */
  | { etape: 'partie'; vue: VueJoueur };
