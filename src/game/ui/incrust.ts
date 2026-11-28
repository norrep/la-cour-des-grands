import Phaser from 'phaser';
import { avecVersion } from '../../version';
import { COULEURS } from '../config';

/**
 * Incrustations : petites animations (≈ 1,4 s) jouées PAR-DESSUS le jeu, pas en plein écran
 * (DF.38). Sans élève dedans, elles servent aux deux bandes et à tous les skins.
 * DF.39 : en 2D, dans le style du plateau (le réalisme est réservé aux moments plein écran).
 * Chaque objet est une image fixe dessinée ; tout le mouvement (gonfle, tremble, ondes, étoiles)
 * est fait en code, ce qui le garde net à toute taille et réglable sans rien régénérer.
 */
export type IncrustId = 'plaquage' | 'sonnerie';

const IMAGES: Record<IncrustId, string> = {
  plaquage: 'nuage',
  sonnerie: 'reveil',
};

const cle = (id: IncrustId): string => `incrust-${id}`;
/** Les images font 512 px sur leur plus grand côté. */
const COTE = 512;
/** Part de la `taille` demandée qu'occupe l'objet ; le reste laisse la place aux effets. */
const PART_OBJET = 0.6;
const ENCRE = COULEURS.encre;
/**
 * Durée maximale d'une incrustation, disparition comprise (ms). Au-delà, elle est détruite
 * d'office : si ses tweens ont été arrêtés en route (redessin de l'écran), elle ne doit pas
 * rester figée sur sa dernière image.
 */
export const DUREE_INCRUST = 1500;

/** Incrustations posées directement sur la scène (sans parent), encore à l'écran. */
const libres = new Set<Phaser.GameObjects.Container>();

/**
 * Efface les incrustations libres de la scène. À appeler quand l'écran se redessine : ses
 * tweens sont arrêtés, elles resteraient sinon figées par-dessus le nouvel écran.
 */
export function effacerIncrustations(scene: Phaser.Scene): void {
  for (const boite of [...libres]) if (boite.scene === scene || !boite.scene) boite.destroy();
}

/** À appeler dans le preload de la scène de chargement. */
export function chargerIncrustations(scene: Phaser.Scene): void {
  for (const [id, fichier] of Object.entries(IMAGES)) {
    scene.load.image(cle(id as IncrustId), avecVersion(`incrust/${fichier}.png`));
  }
}

/**
 * Joue une incrustation centrée en (x, y), dans un carré de `taille` px, puis la détruit.
 * Si `parent` est donné, elle y est ajoutée (elle suit alors ses mouvements).
 */
export function jouerIncrust(
  scene: Phaser.Scene,
  id: IncrustId,
  x: number,
  y: number,
  taille: number,
  options: { parent?: Phaser.GameObjects.Container; profondeur?: number } = {},
): Phaser.GameObjects.Container | null {
  const k = cle(id);
  if (!scene.textures.exists(k)) return null;
  const boite = scene.add.container(x, y);
  if (options.parent) options.parent.add(boite);
  else {
    boite.setDepth(options.profondeur ?? 900);
    libres.add(boite);
    boite.once(Phaser.GameObjects.Events.DESTROY, () => libres.delete(boite));
  }
  const echelle = (taille * PART_OBJET) / COTE;
  const objet = scene.add.image(0, 0, k).setScale(0);
  boite.add(objet);
  const fin = (): void => {
    scene.tweens.add({
      targets: boite,
      alpha: 0,
      scale: 0.6,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => boite.destroy(),
    });
  };
  if (id === 'sonnerie') reveil(scene, boite, objet, echelle, taille, fin);
  else bagarre(scene, boite, objet, echelle, taille, fin);
  // Filet de sécurité : l'horloge de la scène n'est pas arrêtée avec les tweens.
  scene.time.delayedCall(DUREE_INCRUST + 100, () => {
    if (boite.scene) boite.destroy();
  });
  return boite;
}

type Anim = (
  scene: Phaser.Scene,
  boite: Phaser.GameObjects.Container,
  objet: Phaser.GameObjects.Image,
  echelle: number,
  taille: number,
  fin: () => void,
) => void;

/** Apparition commune : l'objet surgit en rebondissant. */
function surgir(scene: Phaser.Scene, objet: Phaser.GameObjects.Image, echelle: number): void {
  scene.tweens.add({ targets: objet, scale: echelle, duration: 220, ease: 'Back.easeOut' });
}

/** Le réveil sonne comme un fou : il sautille, se tortille, avec des traits de vibration. */
const reveil: Anim = (scene, boite, objet, e, taille, fin) => {
  surgir(scene, objet, e);
  const traits = scene.add.graphics();
  for (const cote of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.45;
      const x0 = cote * taille * 0.36;
      const y0 = -taille * 0.12 + Math.sin(a) * taille * 0.2;
      const dx = cote * Math.cos(a) * taille * 0.1;
      const dy = Math.sin(a) * taille * 0.1;
      traits.lineStyle(taille * 0.035, ENCRE, 1);
      traits.lineBetween(x0, y0, x0 + dx, y0 + dy);
    }
  }
  traits.setAlpha(0);
  boite.add(traits);
  scene.tweens.add({
    targets: traits,
    alpha: { from: 0, to: 1 },
    scale: { from: 0.9, to: 1.1 },
    delay: 200,
    duration: 60,
    yoyo: true,
    repeat: 7,
  });
  scene.tweens.add({
    targets: objet,
    angle: { from: -12, to: 12 },
    delay: 200,
    duration: 55,
    yoyo: true,
    repeat: 7,
    onComplete: () => objet.setAngle(0),
  });
  scene.tweens.add({
    targets: objet,
    y: -taille * 0.08,
    scaleY: e * 1.08,
    scaleX: e * 0.94,
    delay: 200,
    duration: 110,
    ease: 'Sine.easeOut',
    yoyo: true,
    repeat: 3,
  });
  scene.time.delayedCall(1250, fin);
};

/** Le nuage de bagarre roule et gonfle, crache des étoiles, puis éclate. */
const bagarre: Anim = (scene, boite, objet, e, taille, fin) => {
  surgir(scene, objet, e);
  scene.tweens.add({
    targets: objet,
    scaleX: { from: e * 1.12, to: e * 0.92 },
    scaleY: { from: e * 0.9, to: e * 1.1 },
    angle: { from: -6, to: 6 },
    delay: 200,
    duration: 120,
    yoyo: true,
    repeat: 3,
  });
  for (let i = 0; i < 5; i++) {
    scene.time.delayedCall(260 + i * 110, () => etoile(scene, boite, taille, i));
  }
  // Pof ! le nuage éclate.
  scene.tweens.add({
    targets: objet,
    scale: e * 1.3,
    alpha: 0,
    delay: 1100,
    duration: 180,
    ease: 'Quad.easeOut',
  });
  scene.time.delayedCall(1300, fin);
};

/** Une étoile jaune cernée d'encre qui jaillit du nuage en tournant. */
function etoile(
  scene: Phaser.Scene,
  boite: Phaser.GameObjects.Container,
  taille: number,
  i: number,
): void {
  const g = scene.add.graphics();
  const r = taille * 0.1;
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 === 0 ? r : r * 0.45;
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  g.fillStyle(0xffd84d, 1);
  g.fillPoints(pts, true);
  g.lineStyle(taille * 0.022, ENCRE, 1);
  g.strokePoints(pts, true);
  boite.add(g);
  const a = -Math.PI / 2 + (i - 2) * 0.75 + (i % 2 ? 0.2 : -0.2);
  const d = taille * (0.42 + (i % 3) * 0.05);
  g.setScale(0.3);
  scene.tweens.add({
    targets: g,
    x: Math.cos(a) * d,
    y: Math.sin(a) * d,
    scale: 1.1,
    angle: i % 2 ? 300 : -300,
    duration: 420,
    ease: 'Quad.easeOut',
  });
  scene.tweens.add({
    targets: g,
    alpha: 0,
    delay: 320,
    duration: 160,
    onComplete: () => g.destroy(),
  });
}
