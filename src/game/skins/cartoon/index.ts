/**
 * Skin « Cartoon » branché sur Phaser : les dessins SVG de `eleves.ts` deviennent des images au
 * chargement, et le pantin est monté à partir de la tête, du corps et de bras en spaghetti.
 */
import Phaser from 'phaser';
import { ROLES, type Bande, type RoleId } from '../../../engine/index';
import type { P, RenduPantin, Skin, TextureSkin } from '../types';
import {
  GABARITS,
  NOIR,
  svgCorps,
  svgPortrait,
  svgTete,
  VUE_CORPS,
  VUE_PORTRAIT,
  VUE_TETE,
} from './eleves';

/** Finesse des images : 2,2 pixels d'image par pixel de jeu pour un élève de taille 100. */
const FINESSE = 2.2;
/** Un élève cartoon est un peu plus grand que le jeton classique de même taille. */
const AGRANDI = 1.1;
/** L'élève est remonté d'une fraction de sa taille : ses pieds ne cachent pas le nom de l'îlot. */
const REMONTE = 0.2;
const BANDES: Bande[] = ['rouge', 'bleu'];

const clePortrait = (role: RoleId, bande: Bande) => `cartoon-portrait-${role}-${bande}`;
const cleTete = (role: RoleId) => `cartoon-tete-${role}`;
const cleCorps = (role: RoleId, bande: Bande) => `cartoon-corps-${role}-${bande}`;
const couleur = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const NOIR_N = couleur(NOIR);

function textures(): TextureSkin[] {
  const liste: TextureSkin[] = [];
  for (const { id } of ROLES) {
    liste.push({ cle: cleTete(id), svg: svgTete(id, FINESSE) });
    for (const b of BANDES) {
      liste.push({ cle: clePortrait(id, b), svg: svgPortrait(id, b, FINESSE) });
      liste.push({ cle: cleCorps(id, b), svg: svgCorps(id, b, FINESSE) });
    }
  }
  return liste;
}

/** Membre mou : un gros trait noir, la couleur par-dessus, légèrement courbé. */
function nouille(
  g: Phaser.GameObjects.Graphics,
  de: P,
  vers: P,
  c: number,
  epaisseur: number,
  courbe: number,
): void {
  const mx = (de.x + vers.x) / 2;
  const my = (de.y + vers.y) / 2;
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const controle = new Phaser.Math.Vector2(mx - dy * courbe, my + dx * courbe);
  const points = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(de.x, de.y),
    controle,
    new Phaser.Math.Vector2(vers.x, vers.y),
  ).getPoints(10);
  for (const [largeur, teinte] of [
    [epaisseur + 7, NOIR_N],
    [epaisseur, c],
  ] as const) {
    g.lineStyle(largeur, teinte, 1);
    g.strokePoints(points, false, false);
    g.fillStyle(teinte, 1);
    for (const p of [points[0], points[points.length - 1]]) {
      if (p) g.fillCircle(p.x, p.y, largeur / 2);
    }
  }
}

function rondCerne(g: Phaser.GameObjects.Graphics, p: P, r: number, c: number): void {
  g.fillStyle(NOIR_N, 1);
  g.fillCircle(p.x, p.y, r + 2.5);
  g.fillStyle(c, 1);
  g.fillCircle(p.x, p.y, r);
}

export const SKIN_CARTOON: Skin = {
  id: 'cartoon',
  textures,
  eleve(scene, bande, role, taille) {
    const img = scene.add.image(0, 0, clePortrait(role, bande));
    const [x, y, l, h] = VUE_PORTRAIT;
    img.setOrigin(-x / l, -y / h);
    img.setScale(((taille / 100) * AGRANDI) / FINESSE);
    img.setY(-taille * REMONTE);
    return scene.add.container(0, 0, [img]);
  },
  pantin(scene, eleve): RenduPantin {
    const gab = GABARITS[eleve.role];
    const derriere = scene.add.graphics();
    const devant = scene.add.graphics();
    const corps = scene.add.image(0, 0, cleCorps(eleve.role, eleve.bande));
    const tete = scene.add.image(0, 0, cleTete(eleve.role));
    corps.setOrigin(-VUE_CORPS[0] / VUE_CORPS[2], -VUE_CORPS[1] / VUE_CORPS[3]);
    tete.setOrigin(-VUE_TETE[0] / VUE_TETE[2], -VUE_TETE[1] / VUE_TETE[3]);
    const peau = couleur(gab.peau);
    const bras = couleur(gab.bras);
    const pantalon = couleur(gab.pantalon);
    const chaussure = couleur(gab.chaussure);
    return {
      objets: [derriere, corps, tete, devant],
      dessiner(s) {
        // Le corps dessiné va du cou au bas de la chasuble : on l'ajuste au tronc du pantin.
        const k = (s.tronc + 8) / gab.hauteur;
        // L'épaule cartoon est au bord du corps : on décale tout le corps pour que la tête ne
        // passe pas sous la main tenue.
        const ca = Math.cos(s.angle);
        const sa = Math.sin(s.angle);
        const lx = (gab.largeur + 20) * k;
        const ly = 12 * k;
        const cou = { x: s.epaule.x + ca * lx - sa * ly, y: s.epaule.y - sa * lx - ca * ly };
        const dx = cou.x - s.cou.x;
        const dy = cou.y - s.cou.y;
        const dec = (p: P): P => ({ x: p.x + dx, y: p.y + dy });
        derriere.clear();
        devant.clear();
        for (const [i, [h, pd]] of s.jambes.entries()) {
          const hanche = dec(h);
          const pied = dec(pd);
          nouille(derriere, hanche, pied, pantalon, 9 * k + 2, i === 0 ? 0.12 : -0.12);
          rondCerne(derriere, pied, 7 * k + 2, chaussure);
        }
        const libre = [dec(s.brasLibre[0]), dec(s.brasLibre[1])] as const;
        nouille(derriere, libre[0], libre[1], bras, 7 * k + 1, 0.18);
        rondCerne(derriere, libre[1], 5 * k + 1, peau);
        for (const img of [corps, tete]) {
          img.setPosition(cou.x, cou.y);
          img.setRotation(-s.angle);
          img.setScale(k / FINESSE);
        }
        // Le bras tenu part du bord du corps et monte en biais vers la main.
        const ex = -(gab.largeur - 5) * k;
        const ey = 14 * k;
        const epaule = { x: cou.x + ca * ex + sa * ey, y: cou.y - sa * ex + ca * ey };
        nouille(devant, s.main, epaule, bras, 7 * k + 1, -0.1);
        devant.lineStyle(3, 0xffe066, 0.9);
        devant.strokeCircle(s.main.x, s.main.y, 14);
        rondCerne(devant, s.main, 5 * k + 1, peau);
      },
    };
  },
};
