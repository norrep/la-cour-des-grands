import type Phaser from 'phaser';
import type { Eleve } from '../../engine/index';
import {
  avancerMembre,
  boutDuMembre,
  membreAuRepos,
  SuiviDoigt,
  type Membre,
  type ReglagesMembre,
} from '../pantin';
import { skinActif } from '../skins/index';
import type { RenduPantin, Squelette } from '../skins/types';

const TRONC: ReglagesMembre = { longueur: 56, amorti: 5 };
const BRAS: ReglagesMembre = { longueur: 40, amorti: 2.2 };
const JAMBE: ReglagesMembre = { longueur: 44, amorti: 2.6 };

/** Hauteur entre le doigt et la main tenue : l'élève pend au-dessus du doigt pour rester visible. */
export const HAUTEUR_PRISE = 160;
/** Point du corps qui sert à viser l'îlot (milieu du tronc), mesuré depuis le doigt. */
export const VISEE = HAUTEUR_PRISE - BRAS.longueur - TRONC.longueur / 2;

/**
 * Élève tenu par la main pendant qu'on le glisse : le bras tenu, le tronc, l'autre bras et les
 * jambes ballottent comme une poupée de chiffon (pendules amortis, voir `pantin.ts`).
 * Ce fichier ne calcule que le squelette : le dessin vient du skin actif.
 */
export class PantinVisuel {
  readonly conteneur: Phaser.GameObjects.Container;
  private readonly rendu: RenduPantin;
  private readonly suivi = new SuiviDoigt();
  private tronc: Membre = membreAuRepos();
  /** Bras tenu (pend sous la main), puis bras libre. */
  private bras: [Membre, Membre] = [
    { angle: 0, vitesse: 0 },
    { angle: 0.4, vitesse: 0 },
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
    this.rendu = skinActif().pantin(scene, eleve);
    this.conteneur = scene.add.container(0, 0, this.rendu.objets);
    // Petite secousse au moment où on l'attrape.
    this.tronc = { angle: 0, vitesse: 3 };
    this.bras[0] = { angle: 0, vitesse: -2 };
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
    // La main tenue est au-dessus du doigt ; le bras tenu pend sous elle jusqu'à l'épaule.
    const main = { x: this.x, y: this.y - HAUTEUR_PRISE };
    const [brasTenu, brasLibre] = this.bras;
    const epaule = boutDuMembre(main.x, main.y, brasTenu.angle, BRAS.longueur);
    // Le tronc pend sous l'épaule, décalé sur le côté (le bras tenu est le bras gauche).
    const a = this.tronc.angle;
    const cou = { x: epaule.x + Math.cos(a) * 14, y: epaule.y - Math.sin(a) * 14 };
    const le = (d: number, cote: number) => ({
      x: cou.x + Math.sin(a) * d + Math.cos(a) * cote,
      y: cou.y + Math.cos(a) * d - Math.sin(a) * cote,
    });
    const jambe = (hanche: { x: number; y: number }, m: Membre) =>
      [hanche, boutDuMembre(hanche.x, hanche.y, m.angle, JAMBE.longueur)] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
    const epauleLibre = le(9, 16);
    const s: Squelette = {
      main,
      epaule,
      cou,
      angle: a,
      tronc: TRONC.longueur,
      le,
      brasLibre: [
        epauleLibre,
        boutDuMembre(epauleLibre.x, epauleLibre.y, brasLibre.angle, BRAS.longueur),
      ],
      jambes: [
        jambe(le(TRONC.longueur - 4, -10), this.jambes[0]),
        jambe(le(TRONC.longueur - 4, 10), this.jambes[1]),
      ],
    };
    this.rendu.dessiner(s);
  }

  destroy(): void {
    this.conteneur.destroy();
  }
}
