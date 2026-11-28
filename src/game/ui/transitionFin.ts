import Phaser from 'phaser';
import type { Bande } from '../../engine/index';
import { equipeDe } from '../../data/equipes';
import {
  BAS,
  COULEURS,
  DROITE,
  GAUCHE,
  HAUT,
  HAUTEUR,
  LARGEUR,
  POLICE,
  RESOLUTION,
} from '../config';
import { jouerIncrust } from './incrust';
import { contourRect, forme } from './style';

/** Durée de la transition, du coup gagnant à l'écran de fin (ms). */
export const DUREE_TRANSITION_FIN = 2300;

export interface MomentFin {
  gagnant: Bande;
  raison: 'cabane' | 'bonsPoints' | 'sonnerie';
  /** Là où la partie s'est gagnée : la cabane prise, la boîte à goûter pleine, la pendule. */
  lieu: { x: number; y: number };
  /** Le mot qui claque : « CABANE PRISE ! ». */
  cri: string;
}

/**
 * Le cri de la transition (DW.5) : le tampon jaune du « À toi ! » (DL.7), avec un liseré
 * intérieur à la couleur de la bande.
 */
function dessinerCri(
  scene: Phaser.Scene,
  texte: string,
  couleur: number,
): Phaser.GameObjects.GameObject[] {
  const t = scene.add
    .text(0, 0, texte, {
      fontFamily: POLICE,
      fontSize: `${texte.length > 14 ? 50 : 62}px`,
      fontStyle: '700',
      color: COULEURS.texteSombre,
      align: 'center',
    })
    .setOrigin(0.5);
  const l = t.width + 80;
  const g = scene.add.graphics();
  forme(g, contourRect(-l / 2, -58, l, 116, 30, 23, 0.9), {
    remplissage: COULEURS.jaune,
    trait: 6,
    ombre: 9,
  });
  g.lineStyle(8, couleur, 1);
  g.strokeRoundedRect(-l / 2 + 11, -47, l - 22, 94, 22);
  return [g, t];
}

/** Le drapeau du gagnant qui se plante sur la cabane prise. */
function drapeau(scene: Phaser.Scene, couleur: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.lineStyle(7, COULEURS.encre, 1);
  g.lineBetween(0, 0, 0, -110);
  forme(
    g,
    [
      { x: 0, y: -110 },
      { x: 70, y: -92 },
      { x: 58, y: -78 },
      { x: 74, y: -60 },
      { x: 0, y: -66 },
    ],
    { remplissage: couleur, trait: 5, ombre: 4 },
  );
  return g;
}

/**
 * La transition de victoire (en code, sans vidéo) : la cour s'assombrit autour de l'endroit où
 * la partie s'est gagnée, la caméra s'en approche, l'événement s'y joue (drapeau planté, goûters
 * qui débordent, réveil qui sonne), un cri de manga claque, puis un rond se referme sur l'écran
 * de fin. Toucher l'écran passe directement à la fin.
 */
export function jouerTransitionFin(
  scene: Phaser.Scene,
  m: MomentFin,
  fin: () => void,
): Phaser.GameObjects.Container {
  const cam = scene.cameras.main;
  const couleur = equipeDe(m.gagnant).couleur;
  const tout = scene.add.container(0, 0).setDepth(850);
  const objets: Phaser.GameObjects.GameObject[] = [];
  let fini = false;
  const terminer = (): void => {
    if (fini) return;
    fini = true;
    cam.setZoom(RESOLUTION).centerOn(LARGEUR / 2, HAUTEUR / 2);
    for (const o of objets) o.destroy();
    tout.destroy();
    fin();
  };

  // 1. Le projecteur : tout s'assombrit sauf un rond autour du lieu. Un anneau
  // plutôt qu'un masque : même rendu en WebGL et en Canvas, et bien moins coûteux.
  const toucher = scene.add
    .rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, 0x000000, 0.001)
    .setOrigin(0, 0)
    .setInteractive()
    .on('pointerdown', terminer);
  tout.add(toucher);
  const LOIN = 3000;
  const voile = scene.add.graphics();
  tout.add(voile);
  const iris = { r: 900, a: 0 };
  const dessinerTrou = (): void => {
    // Un anneau en triangles qui ne se recouvrent pas : l'alpha reste partout le même.
    const r = Math.max(0, iris.r);
    voile.clear();
    voile.fillStyle(COULEURS.fondSombre, iris.a);
    const n = 72;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const b = ((k + 1) / n) * Math.PI * 2;
      const x = m.lieu.x;
      const y = m.lieu.y;
      const [ia, ib] = [
        { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r },
        { x: x + Math.cos(b) * r, y: y + Math.sin(b) * r },
      ];
      const [oa, ob] = [
        { x: x + Math.cos(a) * LOIN, y: y + Math.sin(a) * LOIN },
        { x: x + Math.cos(b) * LOIN, y: y + Math.sin(b) * LOIN },
      ];
      voile.fillTriangle(ia.x, ia.y, oa.x, oa.y, ob.x, ob.y);
      voile.fillTriangle(ia.x, ia.y, ob.x, ob.y, ib.x, ib.y);
    }
  };
  // Le cercle d'encre qui borde le projecteur.
  const bord = scene.add.graphics();
  tout.add(bord);
  const dessinerBord = (): void => {
    bord.clear();
    if (iris.r < 880) {
      bord.lineStyle(8, COULEURS.encre, Math.min(1, iris.a * 1.4));
      bord.strokeCircle(m.lieu.x, m.lieu.y, Math.max(0, iris.r));
    }
  };
  dessinerTrou();
  scene.tweens.add({
    targets: iris,
    r: 150,
    a: 0.78,
    duration: 450,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      dessinerTrou();
      dessinerBord();
    },
  });
  // La caméra s'approche du lieu (sans sortir du décor).
  const zoom = 1.35;
  const cx = Phaser.Math.Clamp(m.lieu.x, LARGEUR / (2 * zoom), LARGEUR - LARGEUR / (2 * zoom));
  const cy = Phaser.Math.Clamp(m.lieu.y, HAUTEUR / (2 * zoom), HAUTEUR - HAUTEUR / (2 * zoom));
  cam.zoomTo(RESOLUTION * zoom, 500, 'Cubic.easeOut');
  cam.pan(cx, cy, 500, 'Cubic.easeOut');

  // 2. Ce qui s'est passé, au lieu même.
  scene.time.delayedCall(350, () => {
    if (fini) return;
    if (m.raison === 'cabane') {
      const d = drapeau(scene, couleur).setPosition(m.lieu.x + 8, m.lieu.y - 40);
      d.setScale(1, 0);
      tout.add(d);
      scene.tweens.add({ targets: d, scaleY: 1, duration: 320, ease: 'Back.easeOut' });
      cam.shake(220, 0.012);
    } else if (m.raison === 'bonsPoints') {
      const cles = ['gouter-chocolat', 'gouter-biscuits', 'gouter-bonbon', 'gouter-sucette'];
      cles.forEach((cle, i) => {
        if (!scene.textures.exists(cle)) return;
        const im = scene.add.image(m.lieu.x, m.lieu.y, cle).setDisplaySize(64, 64);
        tout.add(im);
        // Ils débordent de la boîte vers le milieu de l'écran.
        const vers = Math.atan2(HAUTEUR / 2 - m.lieu.y, LARGEUR / 2 - m.lieu.x);
        const a = vers + (i - 1.5) * 0.5;
        scene.tweens.add({
          targets: im,
          x: m.lieu.x + Math.cos(a) * 110,
          y: m.lieu.y + Math.sin(a) * 110 + 20,
          angle: (i - 1.5) * 40,
          duration: 420,
          delay: i * 60,
          ease: 'Back.easeOut',
        });
      });
    } else {
      jouerIncrust(scene, 'sonnerie', m.lieu.x, m.lieu.y + 40, 180, { profondeur: 860 });
    }
  });

  // 3. Le cri : ce qui s'est passé, en trois mots.
  const yCri = m.lieu.y < HAUTEUR / 2 ? m.lieu.y + 250 : m.lieu.y - 250;
  const cri = scene.add
    .container(cx, Phaser.Math.Clamp(yCri, cy - 330, cy + 330), dessinerCri(scene, m.cri, couleur))
    .setAngle(-4)
    .setScale(0)
    .setDepth(870);
  objets.push(cri);
  scene.time.delayedCall(700, () => {
    if (fini) return;
    scene.tweens.add({ targets: cri, scale: 1.25 / zoom, duration: 260, ease: 'Back.easeOut' });
    cam.shake(160, 0.008);
  });

  // 4. Un rond à la couleur de la bande se referme sur la scène, et l'écran de fin s'ouvre.
  scene.time.delayedCall(1750, () => {
    if (fini) return;
    const rideau = scene.add.graphics().setDepth(880);
    objets.push(rideau);
    const r = { v: 0 };
    scene.tweens.add({
      targets: r,
      v: 1,
      duration: 450,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        rideau.clear();
        rideau.fillStyle(couleur, 1);
        const R = 1600 * r.v;
        rideau.fillCircle(cx, cy, R);
        rideau.lineStyle(10, COULEURS.encre, 1);
        rideau.strokeCircle(cx, cy, R);
      },
      onComplete: terminer,
    });
  });
  return tout;
}
