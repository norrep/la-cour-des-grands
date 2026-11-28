import { equipeDe } from '../../data/equipes';
import Phaser from 'phaser';
import { estSignature, valeur, type Bande, type RoleId } from '../../engine/index';
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
      // Le rôle signature d'un clan a son numéro doré (demande de Clément, DS.5).
      color: estSignature(role) ? OR_TEXTE : COULEURS.texteClair,
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: Math.max(3, Math.round(taille * 0.08)),
    })
    .setOrigin(0.5);
  return scene.add.container(0, 0, [g, texte]);
}

/** Or du rôle signature (DS.5). */
export const OR = 0xf5c13b;
const OR_TEXTE = '#f5c13b';

/**
 * Le numéro doré du rôle signature d'un clan (DS.5) : une étoile d'or, son chiffre écrit dedans.
 * Elle se pose sur le débardeur, en attendant des dessins où le numéro est peint en or.
 */
export function etoileDoree(
  scene: Phaser.Scene,
  role: RoleId,
  rayon: number,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const pointes: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rayon : rayon * 0.55;
    pointes.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(COULEURS.encre, 0.9);
  g.fillPoints(
    pointes.map((p) => new Phaser.Math.Vector2(p.x + 1.5, p.y + 2.5)),
    true,
  );
  g.fillStyle(OR, 1);
  g.fillPoints(pointes, true);
  g.lineStyle(Math.max(2, rayon * 0.12), COULEURS.encre, 1);
  g.strokePoints(pointes, true, true);
  const v = valeur(role);
  const texte = scene.add
    .text(0, rayon * 0.08, v === null ? 'J' : String(v), {
      fontFamily: POLICE,
      fontSize: `${Math.round(rayon * 0.78)}px`,
      color: COULEURS.texteSombre,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  return scene.add.container(0, 0, [g, texte]);
}
