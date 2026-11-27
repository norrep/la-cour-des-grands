/**
 * Décor de la piscine en couches (DP.1). L'ancienne image plein écran plaçait le bassin selon la
 * forme du téléphone, jamais sous la zone de jeu, et ses douches, plongeoirs et échelles
 * ressemblaient à des pièces du jeu. Ici : un carrelage qui remplit l'écran, un bassin calé sur la
 * cour (les vestiaires, c'est-à-dire les cabanes, restent sur le carrelage en haut et en bas), et
 * des casiers sur les côtés quand l'écran est assez large pour en montrer.
 */
import type Phaser from 'phaser';
import { BAS, DROITE, GAUCHE, HAUT } from '../config';
import { versEcran } from '../disposition';

/** Les textures sont dessinées à 3 × l'échelle du jeu (`scripts/couches-piscine.py`). */
const K = 3;

export const COUCHES_PISCINE = {
  sol: 'carte-piscine-sol',
  bassin: 'carte-piscine-bassin',
  vague: 'carte-piscine-vague',
  casiers: 'carte-piscine-casiers',
} as const;

/** Bord extérieur du bassin, en coordonnées de la cour (0 à 1) : à mi-chemin cabane / îlots. */
const BASSIN = { gauche: -0.03, droite: 1.03, haut: 0.13, bas: 0.815 } as const;

/** Les couloirs de nage : deux lignes sombres au fond de l'eau, terminées en T. */
function couloirs(scene: Phaser.Scene, x0: number, y0: number, x1: number, y1: number): void {
  const g = scene.add.graphics();
  g.fillStyle(0x3bb1b3, 0.75);
  const haut = y0 + 70;
  const bas = y1 - 50;
  // Pas de ligne au milieu : les allées et la surveillante y passent déjà.
  for (const f of [0.2, 0.8]) {
    const x = x0 + (x1 - x0) * f;
    g.fillRoundedRect(x - 4, haut, 8, bas - haut, 4);
    g.fillRoundedRect(x - 26, haut - 4, 52, 10, 5);
    g.fillRoundedRect(x - 26, bas - 6, 52, 10, 5);
  }
}

/** Vrai si les textures de la piscine en couches sont chargées. */
export function couchesPiscinePretes(scene: Phaser.Scene): boolean {
  return Object.values(COUCHES_PISCINE).every((k) => scene.textures.exists(k));
}

export function poserDecorPiscine(scene: Phaser.Scene): void {
  // Le carrelage, sur tout l'écran visible.
  scene.add
    .tileSprite(GAUCHE, HAUT, (DROITE - GAUCHE) * K, (BAS - HAUT) * K, COUCHES_PISCINE.sol)
    .setOrigin(0)
    .setScale(1 / K);

  const a = versEcran(BASSIN.gauche, BASSIN.haut);
  const b = versEcran(BASSIN.droite, BASSIN.bas);
  const l = b.x - a.x;
  const h = b.y - a.y;
  // Le bassin en 9 morceaux : les coins gardent leur trait, les bords s'étirent.
  scene.add
    .nineslice(a.x, a.y, COUCHES_PISCINE.bassin, undefined, l * K, h * K, 100, 100, 100, 100)
    .setOrigin(0)
    .setScale(1 / K);
  // L'intérieur de l'eau : 25 px de jeu de margelle (trait compris), puis le trait intérieur.
  const m = 27;
  couloirs(scene, a.x + m, a.y + m, b.x - m, b.y - m);
  scene.add
    .tileSprite(a.x + m, a.y + m, (l - 2 * m) * K, 16 * K, COUCHES_PISCINE.vague)
    .setOrigin(0)
    .setScale(1 / K);

  // Les casiers, sur les côtés, seulement s'il y a la place entre le bord de l'écran et le bassin.
  const place = a.x - GAUCHE - 10;
  if (place < 60) return;
  const casiers = scene.textures.get(COUCHES_PISCINE.casiers).getSourceImage();
  const largeur = Math.min(casiers.width / K, place);
  const k = largeur / casiers.width;
  const haut = casiers.height * k;
  const milieu = (a.y + b.y) / 2;
  for (const cote of [-1, 1]) {
    for (const dy of [-0.52, 0.52]) {
      scene.add
        .image(cote < 0 ? GAUCHE : DROITE, milieu + dy * (haut + 24), COUCHES_PISCINE.casiers)
        .setOrigin(0, 0.5)
        .setScale(-cote * k, k);
    }
  }
}
