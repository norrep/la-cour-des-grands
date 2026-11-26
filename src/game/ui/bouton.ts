import Phaser from 'phaser';
import { COULEURS, POLICE } from '../config';
import { jouerSon } from '../sons';
import { contourRect, forme, graineDe } from './style';

export interface StyleBouton {
  largeur?: number;
  hauteur?: number;
  couleur?: number;
  taille?: number;
  actif?: boolean;
}

/**
 * Bouton cartoon : forme molle au trait noir, ombre pleine comme un autocollant. Au toucher il
 * s'écrase sur son ombre, puis rebondit.
 */
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
  const couleur = actif ? (style.couleur ?? COULEURS.papier) : 0xd8d2c4;
  const ombre = 6;

  const pts = contourRect(-largeur / 2, -hauteur / 2, largeur, hauteur, 20, graineDe(x, y));
  const fond = scene.add.graphics();
  const dessus = scene.add.graphics();
  fond.fillStyle(COULEURS.encre, 1);
  fond.fillPoints(
    pts.map((p) => ({ x: p.x + 2, y: p.y + ombre })),
    true,
  );
  forme(dessus, pts, { remplissage: couleur, trait: 4 });
  // Reflet : un petit trait clair en haut à gauche, comme sur les dessins.
  dessus.lineStyle(4, 0xffffff, 0.55);
  dessus.beginPath();
  dessus.moveTo(-largeur / 2 + 16, -hauteur / 2 + 12);
  dessus.lineTo(-largeur / 2 + Math.min(60, largeur * 0.25), -hauteur / 2 + 10);
  dessus.strokePath();

  const etiquette = scene.add
    .text(0, -1, texte, {
      fontFamily: POLICE,
      fontSize: `${style.taille ?? 26}px`,
      color: COULEURS.texteSombre,
      fontStyle: '600',
      align: 'center',
      wordWrap: { width: largeur - 20 },
    })
    .setOrigin(0.5);

  const face = scene.add.container(0, 0, [dessus, etiquette]);
  const bouton = scene.add.container(x, y, [fond, face]);
  bouton.setSize(largeur, hauteur + ombre);
  if (actif) {
    bouton.setInteractive({ useHandCursor: true });
    const relever = () => face.setPosition(0, 0);
    bouton.on('pointerdown', () => face.setPosition(2, ombre - 1));
    bouton.on('pointerout', relever);
    bouton.on('pointerup', () => {
      relever();
      scene.tweens.add({
        targets: bouton,
        scaleX: { from: 1.06, to: 1 },
        scaleY: { from: 0.94, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      });
      jouerSon('bouton');
      action();
    });
  } else {
    bouton.setAlpha(0.75);
    etiquette.setColor('#8a8478');
  }
  return bouton;
}
