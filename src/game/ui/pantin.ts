import Phaser from 'phaser';
import type { Eleve } from '../../engine/index';
import { COULEURS } from '../config';
import {
  avancerMembre,
  boutDuMembre,
  membreAuRepos,
  SuiviDoigt,
  type Membre,
  type ReglagesMembre,
} from '../pantin';
import { creerBadge } from './badge';

const TRONC: ReglagesMembre = { longueur: 56, amorti: 5 };
const BRAS: ReglagesMembre = { longueur: 40, amorti: 2.2 };
const JAMBE: ReglagesMembre = { longueur: 44, amorti: 2.6 };
const PEAU = 0xf2c9a0;
const CHEVEUX = 0x5a3a22;
const MEMBRES = 0x1d2b22;

/** Hauteur entre le doigt et le cou : l'élève pend au-dessus du doigt pour rester visible. */
export const HAUTEUR_PRISE = 112;
/** Point du corps qui sert à viser l'îlot (milieu du tronc), mesuré depuis le doigt. */
export const VISEE = HAUTEUR_PRISE - TRONC.longueur / 2;

/**
 * Élève tenu par le col pendant qu'on le glisse : tronc, bras et jambes ballottent comme une
 * poupée de chiffon (pendules amortis, voir `pantin.ts`). Le maillot porte sa valeur.
 */
export class PantinVisuel {
  readonly conteneur: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly maillot: Phaser.GameObjects.Container;
  private readonly suivi = new SuiviDoigt();
  private tronc: Membre = membreAuRepos();
  private bras: [Membre, Membre] = [
    { angle: -0.5, vitesse: 0 },
    { angle: 0.5, vitesse: 0 },
  ];
  private jambes: [Membre, Membre] = [
    { angle: -0.15, vitesse: 0 },
    { angle: 0.15, vitesse: 0 },
  ];
  private x: number;
  private y: number;

  constructor(
    scene: Phaser.Scene,
    private readonly eleve: Eleve,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
    this.maillot = creerBadge(scene, eleve.bande, eleve.role, 40);
    this.conteneur = scene.add.container(0, 0, [this.g, this.maillot]);
    // Petite secousse au moment où on l'attrape.
    this.tronc = { angle: 0, vitesse: 3 };
    this.dessiner();
  }

  /** Le doigt est en (x, y) ; `dt` en secondes depuis la dernière image. */
  suivre(x: number, y: number, dt: number): void {
    this.x = x;
    this.y = y;
    this.suivi.suivre(x, y, dt);
    const { ax, ay } = this.suivi;
    this.tronc = avancerMembre(this.tronc, ax, ay, dt, TRONC);
    this.bras = this.bras.map((m) => avancerMembre(m, ax, ay, dt, BRAS)) as [Membre, Membre];
    this.jambes = this.jambes.map((m) => avancerMembre(m, ax, ay, dt, JAMBE)) as [Membre, Membre];
    this.dessiner();
  }

  private dessiner(): void {
    const g = this.g;
    g.clear();
    const cou = { x: this.x, y: this.y - HAUTEUR_PRISE };
    const a = this.tronc.angle;
    const le = (d: number, cote: number) => ({
      x: cou.x + Math.sin(a) * d + Math.cos(a) * cote,
      y: cou.y + Math.cos(a) * d - Math.sin(a) * cote,
    });
    const couleur = this.eleve.bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu;

    const membre = (
      depart: { x: number; y: number },
      m: Membre,
      r: ReglagesMembre,
      bout: number,
    ) => {
      const fin = boutDuMembre(depart.x, depart.y, m.angle, r.longueur);
      g.lineStyle(10, COULEURS.craie, 1);
      g.lineBetween(depart.x, depart.y, fin.x, fin.y);
      g.lineStyle(6, MEMBRES, 1);
      g.lineBetween(depart.x, depart.y, fin.x, fin.y);
      g.fillStyle(bout, 1);
      g.lineStyle(2, COULEURS.craie, 1);
      g.fillCircle(fin.x, fin.y, 6);
      g.strokeCircle(fin.x, fin.y, 6);
    };

    // Jambes derrière, puis tronc, bras et tête.
    const hanches = [le(TRONC.longueur - 4, -10), le(TRONC.longueur - 4, 10)];
    this.jambes.forEach((m, i) =>
      membre(hanches[i] as { x: number; y: number }, m, JAMBE, MEMBRES),
    );
    const bas = le(TRONC.longueur, 0);
    g.lineStyle(36, COULEURS.craie, 1);
    g.lineBetween(cou.x, cou.y, bas.x, bas.y);
    g.lineStyle(30, couleur, 1);
    g.lineBetween(cou.x, cou.y, bas.x, bas.y);
    const epaules = [le(9, -16), le(9, 16)];
    this.bras.forEach((m, i) => membre(epaules[i] as { x: number; y: number }, m, BRAS, PEAU));
    const tete = le(-20, 0);
    g.fillStyle(PEAU, 1);
    g.lineStyle(3, COULEURS.craie, 1);
    g.fillCircle(tete.x, tete.y, 20);
    g.strokeCircle(tete.x, tete.y, 20);
    const meche = le(-34, 0);
    g.fillStyle(CHEVEUX, 1);
    g.fillCircle(meche.x, meche.y, 12);
    // Yeux en croix : il n'en mène pas large.
    g.lineStyle(2, MEMBRES, 1);
    for (const cote of [-6, 6]) {
      const o = le(-20, cote);
      g.lineBetween(o.x - 3, o.y - 3, o.x + 3, o.y + 3);
      g.lineBetween(o.x - 3, o.y + 3, o.x + 3, o.y - 3);
    }

    const milieu = le(TRONC.longueur / 2, 0);
    this.maillot.setPosition(milieu.x, milieu.y);
    this.maillot.setRotation(-a);
  }

  destroy(): void {
    this.conteneur.destroy();
  }
}
