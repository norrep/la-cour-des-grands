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
 * - `aConfirmer` : son coup est fini, il peut encore l'annuler ou le valider ;
 * - `passe` : écran « Passe le téléphone » qui cache le rang du joueur suivant ;
 * - `fin` : partie terminée.
 */
export type Phase = 'jeu' | 'aConfirmer' | 'passe' | 'fin';

export class Controleur {
  etat: EtatPartie;
  /** État au début du tour, pour annuler le coup non confirmé. */
  private debutTour: EtatPartie;
  phase: Phase = 'passe';

  constructor(
    readonly cour: Cour,
    readonly options: OptionsPartie,
  ) {
    this.etat = creerPartie(cour, options);
    this.debutTour = this.etat;
  }

  /** Joue une action. Renvoie `false` si elle est illégale (l'état ne change pas). */
  jouer(action: Action): boolean {
    if (this.phase !== 'jeu') return false;
    try {
      this.etat = jouer(this.etat, action);
    } catch {
      return false;
    }
    if (this.etat.fin) this.phase = 'fin';
    else if (this.etat.courant !== this.debutTour.courant) this.phase = 'aConfirmer';
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

  /** Le coup en cours (ou terminé mais non confirmé) peut-il être annulé ? */
  get peutAnnuler(): boolean {
    return (this.phase === 'jeu' || this.phase === 'aConfirmer') && this.etat !== this.debutTour;
  }

  annuler(): void {
    if (!this.peutAnnuler) return;
    this.etat = this.debutTour;
    this.phase = 'jeu';
  }

  /** Confirme le coup : on passe le téléphone. */
  valider(): void {
    if (this.phase === 'aConfirmer') this.phase = 'passe';
  }

  /** Le joueur suivant a pris le téléphone. */
  reprendre(): void {
    if (this.phase !== 'passe') return;
    this.debutTour = this.etat;
    this.phase = 'jeu';
  }

  /** Nombre d'élèves qu'« appeler » piocherait, ou 0 si c'est interdit. */
  get nombreAppel(): number {
    if (this.phase !== 'jeu' || this.etat.attente) return 0;
    if (!actionsLegales(this.etat).some((a) => a.type === 'appeler')) return 0;
    const j = this.etat.joueurs[this.etat.courant];
    return Math.min(2, 8 - j.rang.length, j.couloir.length);
  }
}
