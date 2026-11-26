import Phaser from 'phaser';
import { COULEURS, HAUTEUR, LARGEUR, POLICE } from '../config';
import { preparerSkin, choisirSkin, skinActif } from '../skins/index';
import { TEXTES } from '../../data/textes';

/** Prépare les images du skin actif, puis ouvre l'accueil. */
export class ChargementScene extends Phaser.Scene {
  constructor() {
    super('chargement');
  }

  create(): void {
    this.add
      .text(LARGEUR / 2, HAUTEUR / 2, TEXTES.chargement, {
        fontFamily: POLICE,
        fontSize: '32px',
        color: COULEURS.texteClair,
      })
      .setOrigin(0.5);
    preparerSkin(this, skinActif().id)
      .catch(() => {
        // Un skin qui ne se charge pas ne doit pas bloquer le jeu : retour aux jetons.
        choisirSkin('classique');
      })
      .finally(() => this.scene.start('accueil'));
  }
}
