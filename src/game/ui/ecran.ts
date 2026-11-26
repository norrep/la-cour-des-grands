/**
 * Mise à l'écran : la caméra de chaque scène est agrandie de `RESOLUTION` (on dessine à la
 * résolution du téléphone) et centrée sur la zone de base de 720 × 1280.
 */
import Phaser from 'phaser';
import { HAUTEUR, HAUTEUR_ECRAN, LARGEUR, LARGEUR_ECRAN, RESOLUTION } from '../config';

export function cadrer(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RESOLUTION).centerOn(LARGEUR / 2, HAUTEUR / 2);
}

/** Les textes sont rendus à la même résolution que le reste, sinon ils seraient flous. */
export function textesNets(): void {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (...args: unknown[]) => Phaser.GameObjects.Text;
  };
  const origine = proto.text;
  proto.text = function (this: unknown, ...args: unknown[]) {
    return origine.apply(this, args).setResolution(RESOLUTION);
  };
}

/** Le décor (720 × 1280) couvre tout l'écran, plus allongé ou plus large, sans être déformé. */
export function decorPlein(image: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
  return image.setScale(Math.max(LARGEUR_ECRAN / image.width, HAUTEUR_ECRAN / image.height));
}
