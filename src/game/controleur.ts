import {
  actionsLegales,
  creerPartie,
  jouer,
  type Action,
  type Cour,
  type EtatPartie,
  type Option,
  type OptionsPartie,
} from '../engine/index';

/**
 * Déroulé d'une partie à deux sur un même téléphone, sans Phaser :
 * - `jeu` : le joueur courant joue (son coup peut passer par plusieurs choix) ;
 * - `passe` : écran « Passe le téléphone » qui cache le rang du joueur suivant ;
 * - `fin` : partie terminée.
 * Un coup est définitif dès qu'il est joué : pas d'annulation ni de confirmation.
 */
export type Phase = 'jeu' | 'passe' | 'fin';

export class Controleur {
  etat: EtatPartie;
  phase: Phase = 'passe';

  constructor(
    readonly cour: Cour,
    readonly options: OptionsPartie,
  ) {
    // À l'écran, un pouvoir sans vrai choix s'applique tout seul (DF.40).
    this.etat = creerPartie(cour, { pouvoirsAuto: true, ...options });
  }

  /** Joue une action. Renvoie `false` si elle est illégale (l'état ne change pas). */
  jouer(action: Action): boolean {
    if (this.phase !== 'jeu') return false;
    const courant = this.etat.courant;
    try {
      this.etat = jouer(this.etat, action);
    } catch {
      return false;
    }
    if (this.etat.fin) this.phase = 'fin';
    else if (this.etat.courant !== courant) this.phase = 'passe';
    return true;
  }

  appeler(): boolean {
    return this.jouer({ type: 'appeler' });
  }

  envoyer(eleveId: string, cible: string): boolean {
    return this.jouer({ type: 'envoyer', eleveId, cible });
  }

  choisir(option: Option): boolean {
    return this.jouer({ type: 'choisir', option });
  }

  passer(): boolean {
    return this.jouer({ type: 'passer' });
  }

  /** Le joueur suivant a pris le téléphone. */
  reprendre(): void {
    if (this.phase === 'passe') this.phase = 'jeu';
  }

  /** Nombre d'élèves qu'« appeler » piocherait, ou 0 si c'est interdit. */
  get nombreAppel(): number {
    if (this.phase !== 'jeu' || this.etat.attente) return 0;
    if (!actionsLegales(this.etat).some((a) => a.type === 'appeler')) return 0;
    const j = this.etat.joueurs[this.etat.courant];
    return Math.min(2, 8 - j.rang.length, j.couloir.length);
  }
}
