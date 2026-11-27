import Phaser from 'phaser';
import { COULEURS, HAUTEUR, LARGEUR, POLICE } from '../config';
import { preparerSkin, choisirSkin, skinActif } from '../skins/index';
import { cadrer } from '../ui/ecran';
import { TEXTES } from '../../data/textes';
import { avecVersion } from '../../version';

/** Clé du décor de la cour (image plein écran derrière le plateau). */
export const DECOR = 'decor-cour';
/** Mme Josiane, la surveillante, et les illustrations des îlots spéciaux (par équipement). */
export const JOSIANE = 'decor-josiane';
/** Pièces illustrées du plateau (phase 2) : sans elles, le plateau est dessiné en code. */
export const PLATEAU = {
  ilot: 'plateau-ilot',
  ilotSpecial: 'plateau-ilot-special',
  cabaneRouge: 'plateau-cabane-rouge',
  cabaneBleue: 'plateau-cabane-bleue',
} as const;
/** Goûters illustrés (DF.21), dans l'ordre des régions de la cour : chocolat, biscuits, bonbon, sucette. */
export const GOUTERS = [
  'gouter-chocolat',
  'gouter-biscuits',
  'gouter-bonbon',
  'gouter-sucette',
] as const;
/** Clé de l'image du goûter de la région n° `i`. */
export function cleGouter(i: number): string {
  return GOUTERS[i % GOUTERS.length] ?? GOUTERS[0];
}
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

/** Prépare la police, le décor et les images du skin actif, puis ouvre l'accueil. */
export class ChargementScene extends Phaser.Scene {
  constructor() {
    super('chargement');
  }

  preload(): void {
    this.load.image(DECOR, avecVersion('decor/cour.jpg'));
    this.load.image(JOSIANE, avecVersion('skins/dodu/josiane.png'));
    const fichiers: Record<keyof typeof PLATEAU, string> = {
      ilot: 'ilot',
      ilotSpecial: 'ilot-special',
      cabaneRouge: 'cabane-rouge',
      cabaneBleue: 'cabane-bleue',
    };
    for (const [piece, cle] of Object.entries(PLATEAU)) {
      this.load.image(cle, avecVersion(`plateau/${fichiers[piece as keyof typeof PLATEAU]}.png`));
    }
    for (const cle of GOUTERS) this.load.image(cle, avecVersion(`gouters/${cle.slice(7)}.png`));
    for (const [equipement, cle] of Object.entries(ILLUSTRATIONS)) {
      if (cle) this.load.image(cle, avecVersion(`decor/${equipement}.png`));
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
    void Promise.all([skin, chargerPolice()]).finally(() => this.scene.start('accueil'));
  }
}
