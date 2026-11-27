import Phaser from 'phaser';
import { avecVersion } from '../../version';

/**
 * Incrustations : petites animations détourées (≈ 1,5 s) jouées PAR-DESSUS le jeu, pas en plein
 * écran (DF.38). Sans élève dedans, elles servent aux deux bandes et à tous les skins.
 * Planches de sprites WebP (256 px, 15 images/s, 8 colonnes) plutôt que des vidéos : la vidéo
 * WebM transparente ne marche pas sur Safari iOS.
 */
export type IncrustId = 'appelCopains' | 'plaquage' | 'sonnerie';

const FICHIERS: Record<IncrustId, { fichier: string; images: number }> = {
  appelCopains: { fichier: 'appel-copains', images: 20 },
  plaquage: { fichier: 'plaquage', images: 24 },
  sonnerie: { fichier: 'sonnerie', images: 19 },
};

const cle = (id: IncrustId): string => `incrust-${id}`;
const IMAGES_PAR_SECONDE = 15;

/** À appeler dans le preload de la scène de chargement. */
export function chargerIncrustations(scene: Phaser.Scene): void {
  for (const [id, f] of Object.entries(FICHIERS)) {
    scene.load.spritesheet(cle(id as IncrustId), avecVersion(`incrust/${f.fichier}.webp`), {
      frameWidth: 256,
      frameHeight: 256,
      endFrame: f.images - 1,
    });
  }
}

/**
 * Joue une incrustation centrée en (x, y), large de `taille` px, puis la détruit.
 * Si `parent` est donné, elle y est ajoutée (elle suit alors ses mouvements).
 */
export function jouerIncrust(
  scene: Phaser.Scene,
  id: IncrustId,
  x: number,
  y: number,
  taille: number,
  options: { parent?: Phaser.GameObjects.Container; profondeur?: number } = {},
): Phaser.GameObjects.Sprite | null {
  const k = cle(id);
  if (!scene.textures.exists(k)) return null;
  if (!scene.anims.exists(k)) {
    scene.anims.create({
      key: k,
      frames: scene.anims.generateFrameNumbers(k, { start: 0, end: FICHIERS[id].images - 1 }),
      frameRate: IMAGES_PAR_SECONDE,
    });
  }
  const s = scene.add.sprite(x, y, k, 0).setScale(taille / 256);
  if (options.parent) options.parent.add(s);
  else s.setDepth(options.profondeur ?? 900);
  s.play(k);
  s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  return s;
}
