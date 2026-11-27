/**
 * Décor de la piscine en couches (DP.1, revu en DP.5–DP.9). Un carrelage qui remplit l'écran ; un
 * bassin rectangulaire calé sur la cour, avec un escalier rond à chaque bout pour le casier ; des
 * reflets qui bougent dans l'eau ; et, sur le carrelage autour, des affaires de baignade
 * (serviettes, tongs, ballon, plantes) qui se balancent un peu. Rien n'est posé sur la cour : les
 * accessoires restent au bord de l'écran pour ne pas passer pour des pièces du jeu.
 */
import type Phaser from 'phaser';
import { BAS, DROITE, GAUCHE, HAUT } from '../config';
import { DESCENTE, MONTEE, versEcran, type Point } from '../disposition';
import { forme } from './style';

/** Le carrelage est dessiné à 3 × l'échelle du jeu (`scripts/couches-piscine.py`). */
const K = 3;

export const COUCHES_PISCINE = {
  sol: 'carte-piscine-sol',
  servietteA: 'carte-piscine-serviette-a',
  serviette: 'carte-piscine-serviette-b',
  tongs: 'carte-piscine-tongs',
  ballon: 'carte-piscine-ballon',
  plante: 'carte-piscine-plante',
} as const;

/** Fichiers des couches, par nom de pièce (sous `public/cartes/piscine/`). */
export const PIECES_PISCINE = ['sol', 'serviette-a', 'serviette-b', 'tongs', 'ballon', 'plante'];

/** Bords gauche et droit du bassin, en coordonnées de la cour (0 à 1). */
const BASSIN = { gauche: -0.03, droite: 1.03 } as const;

const CREME = 0xfef2d8;
const EAU = 0x58c9cb;
const EAU_CLAIRE = 0x8fdcd8;

/** Rectangle aux coins arrondis de rayon `r`, échantillonné en points. */
function rectRond(cx: number, cy: number, rx: number, ry: number, r: number): Point[] {
  const pts: Point[] = [];
  const coins: [number, number, number][] = [
    [cx + rx - r, cy + ry - r, 0],
    [cx - rx + r, cy + ry - r, Math.PI / 2],
    [cx - rx + r, cy - ry + r, Math.PI],
    [cx + rx - r, cy - ry + r, (3 * Math.PI) / 2],
  ];
  for (const [x, y, a0] of coins) {
    for (let k = 0; k <= 10; k++) {
      const a = a0 + (k / 10) * (Math.PI / 2);
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
  }
  return pts;
}

/**
 * Les marches de chaque bout (DP.9, piste « C1 » choisie par Clément) : un escalier en
 * demi-cercle qui descend dans l'eau, du crème au sec jusqu'au bleu pâle immergé. Le casier de
 * la bande est posé sur la marche du haut, au sec.
 */
function escaliers(g: Phaser.GameObjects.Graphics, cx: number, haut: number, bas: number): void {
  const teintes = [0xa9e3dc, 0xd2ecd8, 0xf3f0d6, CREME];
  const rayons = [158, 132, 106, 80];
  for (const [y0, sens] of [
    [haut, 1],
    [bas, -1],
  ] as const) {
    rayons.forEach((r, i) => {
      const pts: Point[] = [];
      for (let k = 0; k <= 32; k++) {
        const t = (k / 32) * Math.PI;
        pts.push({ x: cx + Math.cos(t) * r, y: y0 + sens * Math.sin(t) * r * 0.92 });
      }
      forme(g, pts, { remplissage: teintes[i] ?? CREME, trait: 3.5 });
    });
  }
}

export function couchesPiscinePretes(scene: Phaser.Scene): boolean {
  return Object.values(COUCHES_PISCINE).every((k) => scene.textures.exists(k));
}

export function poserDecorPiscine(scene: Phaser.Scene): void {
  // Le carrelage, sur tout l'écran visible.
  scene.add
    .tileSprite(GAUCHE, HAUT, (DROITE - GAUCHE) * K, (BAS - HAUT) * K, COUCHES_PISCINE.sol)
    .setOrigin(0)
    .setScale(1 / K);

  // En hauteur, le bassin va du bandeau du haut (qu'il touche un peu) jusqu'au bouton d'action,
  // demande de Clément : il passe sous la pioche, les punis et les casiers (DP.8).
  const a = { x: versEcran(BASSIN.gauche, 0).x, y: 92 + MONTEE };
  const b = { x: versEcran(BASSIN.droite, 0).x, y: 1064 + DESCENTE };
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = (b.x - a.x) / 2;
  const ry = (b.y - a.y) / 2;
  const g = scene.add.graphics();
  // Margelle crème, puis l'eau, puis une bande d'eau claire le long du bord.
  forme(g, rectRond(cx, cy, rx, ry, 22), { remplissage: CREME, trait: 4, ombre: 5 });
  forme(g, rectRond(cx, cy, rx - 22, ry - 22, 11), { remplissage: EAU_CLAIRE, trait: 4 });
  forme(g, rectRond(cx, cy, rx - 34, ry - 34, 6), { remplissage: EAU, trait: 0 });
  escaliers(g, cx, a.y + 22, b.y - 22);

  const vivants: { objet: Phaser.GameObjects.Components.Transform; maj: (t: number) => void }[] =
    [];

  // Des reflets dans l'eau : de petites vagues blanches qui vont et viennent.
  const reflets: [number, number][] = [
    [-0.55, -0.62],
    [0.12, -0.78],
    [0.58, -0.3],
    [-0.62, 0.1],
    [0.05, 0.25],
    [0.6, 0.62],
    [-0.35, 0.72],
    [0.3, -0.05],
  ];
  reflets.forEach(([fx, fy], i) => {
    const r = scene.add.graphics();
    r.lineStyle(3.5, 0xffffff, 0.85);
    r.beginPath();
    r.moveTo(-18, 0);
    r.lineTo(-9, -5);
    r.lineTo(0, 0);
    r.lineTo(9, -5);
    r.lineTo(18, 0);
    r.strokePath();
    const x0 = cx + fx * (rx - 70);
    const y0 = cy + fy * (ry - 60);
    r.setPosition(x0, y0);
    vivants.push({
      objet: r,
      maj: (t) => {
        const p = t / 1700 + i * 0.9;
        r.x = x0 + Math.sin(p) * 8;
        r.setAlpha(0.35 + 0.45 * (0.5 + 0.5 * Math.sin(p * 1.3 + i)));
      },
    });
  });

  // Les affaires de baignade, au bord de l'écran et autour du bassin.
  const poser = (
    cle: string,
    x: number,
    y: number,
    taille: number,
    angle: number,
    balance = 0,
  ): void => {
    const im = scene.add.image(x, y, cle);
    im.setScale(taille / im.width).setAngle(angle);
    if (balance) {
      const phase = x * 0.013 + y * 0.007;
      vivants.push({
        objet: im,
        maj: (t) => im.setAngle(angle + Math.sin(t / 900 + phase) * balance),
      });
    }
  };
  const gauche = a.x;
  const droite = b.x;
  const place = gauche - GAUCHE;
  // Coins du bassin : toujours visibles, même sur un téléphone étroit (à moitié hors de l'écran
  // s'il le faut). Plantes en haut, tongs et ballon en bas.
  poser(COUCHES_PISCINE.plante, Math.max(GAUCHE + 26, gauche + 6), a.y + 150, 104, 0, 4);
  poser(COUCHES_PISCINE.plante, Math.min(DROITE - 26, droite - 6), a.y + 150, 104, 40, 4);
  poser(COUCHES_PISCINE.tongs, Math.max(GAUCHE + 30, gauche + 14), b.y - 110, 70, -18);
  poser(COUCHES_PISCINE.ballon, Math.min(DROITE - 30, droite - 10), b.y - 120, 64, 0, 9);
  // Écran plus large que 9:16 : des serviettes étendues sur les côtés.
  if (place >= 70) {
    const xg = GAUCHE + place / 2;
    const xd = DROITE - place / 2;
    // Serviette posée en long : sa longueur (largeur de l'image) suit la hauteur, sa largeur
    // (un peu plus de la moitié de l'image) doit tenir dans la bande de carrelage.
    const l = Math.min(230, (place - 20) / 0.55);
    const petit = Math.min(84, place - 24);
    poser(COUCHES_PISCINE.serviette, xg, cy - ry * 0.32, l, 94, 0);
    poser(COUCHES_PISCINE.ballon, xg + 6, cy + ry * 0.2, petit, 0, 9);
    poser(COUCHES_PISCINE.plante, xg - 4, cy + ry * 0.62, petit + 16, 20, 4);
    poser(COUCHES_PISCINE.servietteA, xd, cy + ry * 0.02, l, 84, 0);
    poser(COUCHES_PISCINE.tongs, xd + 4, cy + ry * 0.5, petit, 22);
  }

  // L'animation ne passe pas par les tweens : l'écran de jeu les arrête à chaque rafraîchissement.
  const animer = (t: number): void => vivants.forEach((v) => v.maj(t));
  scene.events.on('update', animer);
  scene.events.once('shutdown', () => scene.events.off('update', animer));
}
