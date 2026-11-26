import Phaser from 'phaser';
import { COULEURS, HAUTEUR, LARGEUR, POLICE } from '../config';
import { preparerSkin, choisirSkin, skinActif } from '../skins/index';
import { cadrer } from '../ui/ecran';
import { TEXTES } from '../../data/textes';
import { ROLES } from '../../engine/index';

/** Clé du décor de la cour (image plein écran derrière le plateau). */
export const DECOR = 'decor-cour';
/** Mme Josiane, la surveillante, et les illustrations des îlots spéciaux (par équipement). */
export const JOSIANE = 'decor-josiane';
export const ILLUSTRATIONS: Partial<Record<string, string>> = { banc: 'decor-banc' };

/** La police ronde du jeu doit être prête avant d'écrire quoi que ce soit (2 s au plus). */
function chargerPolice(): Promise<unknown> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return Promise.resolve();
  const attente = Promise.all(
    ['500', '600', '700'].map((poids) => fonts.load(`${poids} 24px Fredoka`)),
  );
  return Promise.race([attente, new Promise((ok) => setTimeout(ok, 2000))]);
}

/** Les vidéos de pouvoir du skin se téléchargent en fond : elles seront prêtes en partie. */
function prechargerVideos(): void {
  const skin = skinActif();
  if (!skin.videoPouvoir || typeof fetch !== 'function') return;
  const urls = new Set(
    ROLES.flatMap(({ id }) => (['rouge', 'bleu'] as const).map((b) => skin.videoPouvoir?.(b, id))),
  );
  for (const url of urls) if (url) void fetch(url).catch(() => undefined);
}

/** Prépare la police, le décor et les images du skin actif, puis ouvre l'accueil. */
export class ChargementScene extends Phaser.Scene {
  constructor() {
    super('chargement');
  }

  preload(): void {
    this.load.image(DECOR, 'decor/cour.jpg');
    this.load.image(JOSIANE, 'decor/josiane.png');
    for (const [equipement, cle] of Object.entries(ILLUSTRATIONS)) {
      if (cle) this.load.image(cle, `decor/${equipement}.png`);
    }
  }

  create(): void {
    cadrer(this);
    this.add
      .text(LARGEUR / 2, HAUTEUR / 2, TEXTES.chargement, {
        fontFamily: POLICE,
        fontSize: '32px',
        color: COULEURS.texteClair,
      })
      .setOrigin(0.5);
    const skin = preparerSkin(this, skinActif().id).catch(() => {
      // Un skin qui ne se charge pas ne doit pas bloquer le jeu : retour aux jetons.
      choisirSkin('classique');
    });
    void Promise.all([skin, chargerPolice()]).finally(() => {
      prechargerVideos();
      this.scene.start('accueil');
    });
  }
}
