/**
 * Ce que chaque carte montre (DB.5) : son décor, l'illustration de chaque îlot (clé `decor` du
 * plan), sa cabane neutre (teintée à la couleur de l'équipe) et son surveillant en marionnette.
 * Les images d'une carte ne sont chargées qu'au moment de la jouer.
 */
import type Phaser from 'phaser';
import type { CarteId } from '../data/cartes';
import type { Rig } from './ui/marionnette';
import type { IdSurveillant } from './ui/surveillant';
import { RIG_JOSIANE } from './skins/cartoon/rig';
import { avecVersion } from '../version';
import { PIECES_PISCINE } from './ui/decorPiscine';

export interface VisuelCarte {
  /** Clé de la texture du décor plein écran. */
  decor: string;
  /** Îlots illustrés : clé `decor` de l'îlot → clé de texture (512 × 512, dessin centré). */
  ilots: Record<string, string>;
  /** Cabane de la carte (sinon celles de la récré) : l'image et ses murs à teinter. */
  cabane?: { image: string; murs: string };
  /** Le surveillant : texture des pièces et leur rig. */
  surveillant: { texture: string; rig: Rig; id: IdSurveillant };
}

const RIG_MAITRE_NAGEUR: Rig = {
  hauteur: 770,
  bras: 35.0,
  main: [-255.5, 0.0],
  pieces: {
    jambeG: { cadre: [0, 0, 111, 305], pivot: [86.0, 9.0], pos: [-26.0, -296.0] },
    jambeD: { cadre: [127, 0, 109, 305], pivot: [23.0, 9.0], pos: [26.0, -296.0] },
    brasG: { cadre: [252, 0, 260, 47], pivot: [255.5, 20.0], pos: [-47.5, -530.0] },
    brasD: { cadre: [528, 0, 256, 47], pivot: [4.5, 20.0], pos: [47.5, -530.0] },
    tronc: { cadre: [800, 0, 104, 272], pivot: [52.0, 263.0], pos: [0.0, -296.0] },
    tete: { cadre: [920, 0, 192, 220], pivot: [97.0, 211.0], pos: [0.0, -559.0] },
  },
};

const RIG_CHEFTAINE: Rig = {
  hauteur: 770,
  bras: 47.0,
  main: [-216.5, 0.0],
  pieces: {
    jambeG: { cadre: [0, 0, 125, 259], pivot: [77.0, 9.0], pos: [-48.0, -250.0] },
    jambeD: { cadre: [141, 0, 133, 259], pivot: [48.0, 9.0], pos: [48.0, -250.0] },
    brasG: { cadre: [290, 0, 221, 65], pivot: [216.5, 32.0], pos: [-91.5, -524.0] },
    brasD: { cadre: [527, 0, 222, 65], pivot: [4.5, 32.0], pos: [92.5, -524.0] },
    tronc: { cadre: [765, 0, 193, 321], pivot: [96.0, 312.0], pos: [0.0, -250.0] },
    tete: { cadre: [974, 0, 265, 212], pivot: [130.0, 208.0], pos: [0.0, -562.0] },
  },
};

const ILOTS: Record<CarteId, string[]> = {
  'cour-premier-jour': [],
  piscine: ['douches', 'plongeoir', 'beignet', 'matelas', 'bouee', 'canard', 'echelle', 'bord'],
  'camp-scout': [
    'hamac',
    'tasDeBois',
    'tyrolienne',
    'feuDeCamp',
    'echelleDeCorde',
    'source',
    'totem',
  ],
};

const cle = (carte: CarteId, piece: string): string => `carte-${carte}-${piece}`;

export function visuelCarte(carte: CarteId): VisuelCarte {
  if (carte === 'cour-premier-jour') {
    return {
      decor: 'decor-cour',
      ilots: {},
      surveillant: { texture: 'decor-josiane', rig: RIG_JOSIANE, id: 'josiane' },
    };
  }
  return {
    decor: cle(carte, 'decor'),
    ilots: Object.fromEntries(ILOTS[carte].map((n) => [n, cle(carte, n)])),
    cabane: { image: cle(carte, 'cabane'), murs: cle(carte, 'cabane-murs') },
    surveillant: {
      texture: cle(carte, 'surveillant'),
      rig: carte === 'piscine' ? RIG_MAITRE_NAGEUR : RIG_CHEFTAINE,
      id: carte === 'piscine' ? 'maitreNageur' : 'cheftaine',
    },
  };
}

/** Les fichiers d'une carte (chemins sous `public/`), par clé de texture. */
function fichiers(carte: CarteId): Record<string, string> {
  if (carte === 'cour-premier-jour') return {};
  const f: Record<string, string> = {
    [cle(carte, 'decor')]: `decor/${carte}.jpg`,
    // Piscine : la base de chaque bande est un casier du vestiaire (DP.6).
    [cle(carte, 'cabane')]: `cartes/${carte}/${carte === 'piscine' ? 'casier' : 'cabane'}.png`,
    [cle(carte, 'cabane-murs')]:
      `cartes/${carte}/${carte === 'piscine' ? 'casier-murs' : 'cabane-murs'}.png`,
    ...(carte === 'piscine'
      ? Object.fromEntries(PIECES_PISCINE.map((n) => [cle(carte, n), `cartes/${carte}/${n}.png`]))
      : {}),
    [cle(carte, 'surveillant')]:
      `skins/dodu/${carte === 'piscine' ? 'maitre-nageur' : 'cheftaine'}.png`,
  };
  for (const n of ILOTS[carte]) f[cle(carte, n)] = `cartes/${carte}/${n}.png`;
  return f;
}

/** Charge les images de la carte (une fois) ; une image manquante n'empêche pas de jouer. */
export async function preparerCarte(scene: Phaser.Scene, carte: CarteId): Promise<void> {
  await Promise.all(
    Object.entries(fichiers(carte)).map(
      ([k, url]) =>
        new Promise<void>((ok) => {
          if (scene.textures.exists(k)) return ok();
          const img = new Image();
          img.onload = () => {
            if (!scene.textures.exists(k)) scene.textures.addImage(k, img);
            ok();
          };
          img.onerror = () => ok();
          img.src = avecVersion(url);
        }),
    ),
  );
}
