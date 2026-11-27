import { graineVersEtat, type Action, type Bande, type EtatPartie } from '../engine/index';
import { choisirAction, type Niveau } from '../ia/index';

export const NIVEAUX_ORDI: readonly Niveau[] = ['facile', 'moyen', 'difficile'];

/** Le niveau qui suit dans la liste (pour le bouton de l'accueil). */
export function niveauSuivant(n: Niveau): Niveau {
  const i = NIVEAUX_ORDI.indexOf(n);
  return NIVEAUX_ORDI[(i + 1) % NIVEAUX_ORDI.length] as Niveau;
}

/**
 * L'ordinateur, adversaire d'une partie en solo. Il joue la bande `bande` ; le joueur humain
 * joue l'autre. Sans Phaser : l'écran lui demande seulement sa prochaine action.
 */
export class Ordi {
  private rng: number;

  constructor(
    readonly bande: Bande,
    readonly niveau: Niveau,
    graine: number,
  ) {
    // Un hasard à lui, séparé de celui de la partie.
    this.rng = graineVersEtat(graine * 31 + 17);
  }

  get humain(): Bande {
    return this.bande === 'rouge' ? 'bleu' : 'rouge';
  }

  /** Est-ce à l'ordinateur de jouer ? */
  doitJouer(etat: EtatPartie): boolean {
    return !etat.fin && etat.courant === this.bande;
  }

  prochaineAction(etat: EtatPartie): Action {
    const [action, rng] = choisirAction(etat, this.niveau, this.rng);
    this.rng = rng;
    return action;
  }
}
