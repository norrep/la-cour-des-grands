import { equipeDe } from '../../data/equipes';
import Phaser from 'phaser';
import { valeur, type Bande, type RoleId } from '../../engine/index';
import { COULEURS, POLICE } from '../config';

/**
 * Badge d'un élève : rond pour la bande rouge, carré pour la bande bleue (lisible sans
 * distinguer les couleurs), avec sa valeur écrite en gros (« J » pour le joker).
 */
export function creerBadge(
  scene: Phaser.Scene,
  bande: Bande,
  role: RoleId,
  taille: number,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const couleur = equipeDe(bande).couleur;
  const r = taille / 2;
  g.fillStyle(0x000000, 0.25);
  if (bande === 'rouge') g.fillCircle(2, 4, r);
  else g.fillRoundedRect(-r + 2, -r + 4, taille, taille, taille * 0.12);
  g.fillStyle(couleur, 1);
  g.lineStyle(Math.max(3, taille * 0.07), COULEURS.craie, 1);
  if (bande === 'rouge') {
    g.fillCircle(0, 0, r);
    g.strokeCircle(0, 0, r);
  } else {
    g.fillRoundedRect(-r, -r, taille, taille, taille * 0.12);
    g.strokeRoundedRect(-r, -r, taille, taille, taille * 0.12);
  }
  const v = valeur(role);
  const texte = scene.add
    .text(0, 1, v === null ? 'J' : String(v), {
      fontFamily: POLICE,
      fontSize: `${Math.round(taille * 0.62)}px`,
      color: COULEURS.texteClair,
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: Math.max(3, Math.round(taille * 0.08)),
    })
    .setOrigin(0.5);
  return scene.add.container(0, 0, [g, texte]);
}
