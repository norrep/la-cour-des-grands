import Phaser from 'phaser';
import { COULEURS, LARGEUR, POLICE } from '../config';
import { contourRect, forme, graineDe, panneau } from './style';

/**
 * Le guide du tutoriel (DJ.2) : une bulle de papier au trait d'encre, et une main dessinée qui
 * montre le geste à faire (glisser un élève, toucher un bouton).
 */

/** La main qui montre : le bout de l'index est en (0, 0), la main vient d'en bas à droite. */
export function creerMain(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const peau = 0xfff6e4;
  const style = { remplissage: peau, trait: 5, ombre: 0 };
  // La paume et les doigts repliés.
  forme(g, contourRect(-10, 46, 74, 66, 26, 11, 1), style);
  // Le pouce, couché sur le côté gauche.
  forme(g, contourRect(-30, 62, 36, 24, 12, 7, 0.8), style);
  // L'index tendu, dessiné en dernier pour passer devant la paume.
  forme(g, contourRect(-12, -4, 28, 78, 14, 5, 0.8), style);
  // Les plis des doigts repliés.
  g.lineStyle(4, COULEURS.encre, 1);
  for (const x of [26, 44]) {
    g.beginPath();
    g.moveTo(x, 50);
    g.lineTo(x, 66);
    g.strokePath();
  }
  // La manchette, à la couleur de la bande rouge.
  forme(g, contourRect(-4, 104, 66, 30, 8, 3, 0.8), {
    remplissage: COULEURS.rouge,
    trait: 5,
    ombre: 0,
  });
  return scene.add.container(0, 0, [g]).setRotation(-0.32);
}

/** Un rond d'onde là où le doigt touche. */
export function onde(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Arc {
  const c = scene.add.circle(x, y, 18);
  c.setStrokeStyle(6, COULEURS.encre, 0.8);
  c.setFillStyle(COULEURS.allume, 0.5);
  return c;
}

export interface OptionsBulle {
  /** Petit titre dans l'onglet jaune (« Leçon 1/3 »). */
  etiquette: string;
  texte: string;
  /** Centre vertical de la bulle. */
  y: number;
  largeur?: number;
}

/** La bulle du guide : papier crème, onglet jaune, texte à l'encre. */
export function bulleGuide(scene: Phaser.Scene, o: OptionsBulle): Phaser.GameObjects.Container {
  const l = o.largeur ?? 640;
  const t = scene.add
    .text(0, 0, o.texte, {
      fontFamily: POLICE,
      fontSize: '27px',
      color: COULEURS.texteSombre,
      fontStyle: '600',
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: l - 56 },
    })
    .setOrigin(0.5);
  const h = Math.max(96, t.height + 44);
  const fond = scene.add.graphics();
  panneau(fond, -l / 2, -h / 2, l, h, { rayon: 26, ombre: 7, trait: 5 });
  const onglet = scene.add.text(0, 0, o.etiquette, {
    fontFamily: POLICE,
    fontSize: '22px',
    color: COULEURS.texteSombre,
    fontStyle: '700',
  });
  onglet.setOrigin(0.5);
  const lo = onglet.width + 34;
  const fondOnglet = scene.add.graphics();
  const yo = -h / 2 - 4;
  forme(fondOnglet, contourRect(-lo / 2, yo - 20, lo, 40, 14, graineDe(lo, 3), 0.8), {
    remplissage: COULEURS.jaune,
    trait: 4,
  });
  onglet.setPosition(0, yo);
  t.setY(6);
  return scene.add.container(LARGEUR / 2, o.y, [fond, t, fondOnglet, onglet]);
}
