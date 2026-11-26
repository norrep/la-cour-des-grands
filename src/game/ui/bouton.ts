import Phaser from 'phaser';
import { COULEURS, POLICE } from '../config';

export interface StyleBouton {
  largeur?: number;
  hauteur?: number;
  couleur?: number;
  taille?: number;
  actif?: boolean;
}

/** Bouton tactile simple : rectangle arrondi + texte, avec un petit enfoncement au toucher. */
export function creerBouton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texte: string,
  action: () => void,
  style: StyleBouton = {},
): Phaser.GameObjects.Container {
  const largeur = style.largeur ?? 260;
  const hauteur = style.hauteur ?? 64;
  const actif = style.actif ?? true;
  const couleur = actif ? (style.couleur ?? COULEURS.papier) : 0x8a8a7a;

  const fond = scene.add.graphics();
  fond.fillStyle(0x000000, 0.25);
  fond.fillRoundedRect(-largeur / 2 + 3, -hauteur / 2 + 5, largeur, hauteur, 16);
  fond.fillStyle(couleur, 1);
  fond.fillRoundedRect(-largeur / 2, -hauteur / 2, largeur, hauteur, 16);
  fond.lineStyle(3, COULEURS.fondSombre, 1);
  fond.strokeRoundedRect(-largeur / 2, -hauteur / 2, largeur, hauteur, 16);

  const etiquette = scene.add
    .text(0, 0, texte, {
      fontFamily: POLICE,
      fontSize: `${style.taille ?? 26}px`,
      color: COULEURS.texteSombre,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: largeur - 16 },
    })
    .setOrigin(0.5);

  const bouton = scene.add.container(x, y, [fond, etiquette]);
  bouton.setSize(largeur, hauteur);
  if (actif) {
    bouton.setInteractive({ useHandCursor: true });
    bouton.on('pointerdown', () => bouton.setScale(0.95));
    bouton.on('pointerout', () => bouton.setScale(1));
    bouton.on('pointerup', () => {
      bouton.setScale(1);
      action();
    });
  } else {
    bouton.setAlpha(0.6);
  }
  return bouton;
}
