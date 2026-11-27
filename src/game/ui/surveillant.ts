/**
 * Le surveillant de la carte (Mme Josiane, Monsieur Yvon, Babette), en deux tenues (DS.1) :
 *
 * - **Sur la cour, un médaillon** : sa grosse tête et ses épaules dans une rosette festonnée
 *   jaune à cœur bleu nuit, avec deux rubans et son nom sur une banderole. Rien à voir avec les
 *   pastilles des élèves (rondes ou carrées, fond clair, chiffre) : on le repère d'un coup d'œil.
 *   Sans corps, c'est la tête qui joue : elle ne tient pas en place (tics propres à chacun) et
 *   réagit au jeu (sifflet, colère, surprise, indignation, satisfaction), avec des accessoires
 *   dessinés en code, en 2D cartoon (règle du 27/11 : pas de réalisme dans les incrustations).
 * - **En pied à la présentation de la carte** : il entre en marchant, siffle, montre la règle
 *   spéciale du bras, s'agite en attendant, puis se range en médaillon sur la cour.
 *
 * Les dessins restent ceux des marionnettes (même trait, DG.18) : on ne les déforme pas, on les
 * fait bouger, pencher, sauter, rougir.
 */
import Phaser from 'phaser';
import { COULEURS, POLICE } from '../config';
import { contourRond, forme, type P } from './style';
import { Marionnette, poseRepos, type PoseMarionnette, type Rig } from './marionnette';

export type IdSurveillant = 'josiane' | 'maitreNageur' | 'cheftaine';
export type Reaction = 'sifflet' | 'colere' | 'surprise' | 'indigne' | 'content';

/** Couleurs propres aux surveillants : aucune équipe n'a ce jaune et ce bleu nuit ensemble. */
export const COULEURS_SURVEILLANT = {
  coeur: 0x34405c,
  coeurClair: 0x47577a,
  feston: 0xffd84d,
  ruban: 0xff9f43,
  rubanOmbre: 0xd97a22,
  banderole: 0xfff4dc,
} as const;

/** Repères de chaque tête, en pixels de texture au-dessus du cou : yeux et bouche. */
const VISAGES: Record<IdSurveillant, { yeux: number; bouche: number; cote: number }> = {
  josiane: { yeux: 80, bouche: 42, cote: 52 },
  maitreNageur: { yeux: 105, bouche: 52, cote: 70 },
  cheftaine: { yeux: 70, bouche: 42, cote: 62 },
};

/** Les tics de chacun, tirés au hasard entre deux réactions. */
const TICS: Record<IdSurveillant, NomTic[]> = {
  josiane: ['scrute', 'note', 'cafe', 'soupcon', 'lunettes', 'scrute', 'baille', 'sifflote'],
  maitreNageur: ['jumelles', 'scrute', 'frime', 'sifflote', 'soupcon', 'baille', 'jumelles'],
  cheftaine: ['chante', 'compte', 'jumelles', 'scrute', 'soupcon', 'chante', 'sifflote'],
};

type NomTic =
  | 'scrute'
  | 'note'
  | 'cafe'
  | 'soupcon'
  | 'lunettes'
  | 'baille'
  | 'sifflote'
  | 'jumelles'
  | 'frime'
  | 'chante'
  | 'compte';

/** Ce qu'un tic fait à la tête en plus de la pose : décalage, rotation, taille, rougeur. */
interface Tete {
  dx: number;
  dy: number;
  rot: number;
  echelle: number;
  /** De 0 (teint normal) à 1 (rouge de colère). */
  rouge: number;
}

interface Contexte {
  scene: Phaser.Scene;
  /** Calque qui suit la tête (origine au cou, en pixels de jeu). */
  calque: Phaser.GameObjects.Container;
  /** Hauteurs utiles au-dessus du cou, en pixels de jeu. */
  yeux: number;
  bouche: number;
  sommet: number;
  cote: number;
  /** Objets créés par le tic, détruits à sa fin. */
  objets: Phaser.GameObjects.GameObject[];
}

interface Tic {
  duree: number;
  debut?: (c: Contexte) => void;
  /** `q` de 0 à 1 sur la durée du tic, `t` en secondes depuis son début. */
  maj: (q: number, t: number, o: PoseMarionnette, tete: Tete, c: Contexte) => void;
}

const cloche = (q: number): number => Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);
/** Monte vite, tient, redescend : pour un accessoire qui reste le temps du tic. */
const plateau = (q: number, bord = 0.18): number =>
  Math.min(1, Math.min(q, 1 - q) / bord) * (q > 0 && q < 1 ? 1 : 0);

/* ------------------------------------------------------------------------------------------ */
/* Accessoires dessinés en code                                                                 */
/* ------------------------------------------------------------------------------------------ */

function ajouter<T extends Phaser.GameObjects.GameObject>(c: Contexte, o: T): T {
  c.calque.add(o);
  c.objets.push(o);
  return o;
}

/** Un mot qui jaillit (« Tuuut ! », « ? », « Grrr ! ») : pop, petit tremblement, puis s'efface. */
function mot(
  c: Contexte,
  texte: string,
  x: number,
  y: number,
  taille: number,
  couleur = '#ffe066',
  angle = -8,
): Phaser.GameObjects.Text {
  const t = ajouter(
    c,
    c.scene.add
      .text(x, y, texte, {
        fontFamily: POLICE,
        fontSize: `${taille}px`,
        fontStyle: '700',
        color: couleur,
        stroke: COULEURS.texteSombre,
        strokeThickness: Math.max(4, Math.round(taille * 0.22)),
      })
      .setOrigin(0.5)
      .setAngle(angle)
      .setScale(0.2),
  );
  c.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
  return t;
}

/** Le sifflet jaune, embout dans la bouche, et les traits du son. */
function sifflet(c: Contexte, fort: boolean): Phaser.GameObjects.Container {
  const g = c.scene.add.graphics();
  const k = fort ? 1.15 : 0.9;
  forme(
    g,
    [
      { x: 0, y: -5 * k },
      { x: 20 * k, y: -8 * k },
      { x: 26 * k, y: -2 * k },
      { x: 26 * k, y: 7 * k },
      { x: 18 * k, y: 11 * k },
      { x: 8 * k, y: 9 * k },
      { x: 0, y: 5 * k },
    ],
    { remplissage: COULEURS.jaune, trait: 3 },
  );
  g.fillStyle(COULEURS.encre, 1);
  g.fillCircle(16 * k, 1 * k, 3 * k);
  const traits = c.scene.add.graphics();
  traits.lineStyle(3, COULEURS.encre, 1);
  for (const a of [-0.55, 0, 0.55]) {
    const x0 = 32 * k + Math.cos(a) * 4;
    const y0 = Math.sin(a) * 10;
    traits.lineBetween(x0, y0, x0 + Math.cos(a) * 12 * k, y0 + Math.sin(a) * 12 * k);
  }
  const s = ajouter(c, c.scene.add.container(c.cote * 0.15, -c.bouche, [g, traits]));
  c.scene.tweens.add({
    targets: traits,
    alpha: { from: 1, to: 0.2 },
    duration: 90,
    yoyo: true,
    repeat: -1,
  });
  return s;
}

/** Bouffée de vapeur qui monte et s'efface (colère, café). */
function vapeur(c: Contexte, x: number, y: number, r: number, retard: number, dx = 0): void {
  const g = c.scene.add.graphics();
  forme(g, contourRond(0, 0, r, x * 3 + y + retard), { remplissage: 0xffffff, trait: 3 });
  const o = ajouter(c, g.setPosition(x, y).setScale(0.3).setAlpha(0));
  c.scene.tweens.add({
    targets: o,
    delay: retard,
    y: y - 26,
    x: x + dx,
    scale: 1.1,
    alpha: { from: 1, to: 0 },
    duration: 650,
    ease: 'Quad.easeOut',
  });
}

/** Étoile de brillance (lunettes, sourire de frimeur). */
function eclat(c: Contexte, x: number, y: number, r: number): void {
  const g = c.scene.add.graphics();
  const pts: P[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.32;
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
  }
  forme(g, pts, { remplissage: 0xfffbe0, trait: 3 });
  const o = ajouter(c, g.setPosition(x, y).setScale(0));
  c.scene.tweens.add({
    targets: o,
    scale: 1,
    angle: 90,
    duration: 260,
    yoyo: true,
    hold: 160,
    ease: 'Back.easeOut',
  });
}

/** Une note de musique qui s'envole en ondulant. */
function note(c: Contexte, x: number, y: number, retard: number): void {
  const g = c.scene.add.graphics();
  g.lineStyle(3, COULEURS.encre, 1);
  g.fillStyle(COULEURS.encre, 1);
  g.fillEllipse(0, 0, 11, 8);
  g.lineBetween(5, -1, 5, -20);
  g.lineBetween(5, -20, 12, -14);
  const o = ajouter(c, g.setPosition(x, y).setAlpha(0).setAngle(-12));
  c.scene.tweens.add({
    targets: o,
    delay: retard,
    y: y - 34,
    x: { from: x, to: x + 14 },
    alpha: { from: 1, to: 0 },
    angle: 12,
    duration: 900,
    ease: 'Sine.easeOut',
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Tics et réactions                                                                           */
/* ------------------------------------------------------------------------------------------ */

const TIC: Record<NomTic | Reaction, Tic> = {
  // Balaie la cour du regard, d'un côté puis de l'autre, en se penchant.
  scrute: {
    duree: 2.4,
    maj(q, t, o, tete) {
      const cote = q < 0.5 ? -1 : 1;
      o.regard = cote;
      const c = cloche(q < 0.5 ? q * 2 : (q - 0.5) * 2);
      tete.dx += cote * c * 7;
      tete.rot += cote * c * 0.14;
      tete.dy += c * 2;
    },
  },
  // Un œil soupçonneux, la tête penchée, « ? » au-dessus.
  soupcon: {
    duree: 1.8,
    debut(c) {
      mot(c, '?', c.cote * 0.7, -c.sommet - 6, 34, '#ffe066', 12);
    },
    maj(q, t, o, tete) {
      const c = cloche(q);
      tete.rot += c * 0.28;
      tete.dx += c * 5;
      tete.dy += Math.sin(t * 9) * 1.5 * c;
    },
  },
  // Josiane note un nom dans son cahier : il remonte, elle baisse le nez, le crayon gratte.
  note: {
    duree: 2.2,
    debut(c) {
      const g = c.scene.add.graphics();
      g.lineStyle(2.5, COULEURS.encre, 1);
      const o = ajouter(c, g.setPosition(-c.cote * 0.1, c.bouche * 0.2));
      let k = 0;
      const ev = c.scene.time.addEvent({
        delay: 150,
        repeat: 9,
        callback: () => {
          k += 1;
          g.lineBetween(-12 + k * 2.5, 8 + (k % 3) * 4, -9 + k * 2.5, 6 + (k % 3) * 4);
        },
      });
      o.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
    },
    maj(q, t, o, tete) {
      const c = cloche(q);
      o.objetY -= c * 0.06;
      o.objetRot -= c * 0.14;
      o.coudeG -= c * 0.45;
      o.coudeD -= c * 0.45 + Math.sin(t * 30) * 0.15 * c;
      tete.rot += c * 0.22;
      tete.dy += c * 5;
    },
  },
  // Une gorgée de café brûlant : la tasse monte, elle souffle, elle boit, elle grimace.
  cafe: {
    duree: 2.8,
    debut(c) {
      const g = c.scene.add.graphics();
      forme(
        g,
        [
          { x: -9, y: -11 },
          { x: 9, y: -11 },
          { x: 8, y: 11 },
          { x: -8, y: 11 },
        ],
        { remplissage: 0xffffff, trait: 3 },
      );
      g.lineStyle(3, COULEURS.encre, 1);
      g.strokeCircle(12, 0, 5);
      g.fillStyle(COULEURS.surveillante, 1);
      g.fillRect(-7, -3, 14, 5);
      const tasse = ajouter(c, g.setPosition(c.cote * 0.75, 30));
      c.scene.tweens.add({
        targets: tasse,
        x: c.cote * 0.42,
        y: -c.bouche + 6,
        angle: -18,
        duration: 500,
        ease: 'Back.easeOut',
      });
      c.scene.tweens.add({
        targets: tasse,
        delay: 2100,
        y: 34,
        angle: 0,
        duration: 500,
        ease: 'Quad.easeIn',
      });
      for (let i = 0; i < 4; i++) vapeur(c, c.cote * 0.45, -c.bouche - 14, 5, 300 + i * 320, 4);
    },
    maj(q, t, o, tete) {
      const boit = cloche((q - 0.25) / 0.45);
      tete.rot -= boit * 0.22;
      tete.dy -= boit * 3;
      // Brûlant ! Petit frisson à la fin.
      if (q > 0.72) tete.dx += Math.sin(t * 50) * 2 * cloche((q - 0.72) / 0.28);
    },
  },
  // Elle remonte ses lunettes : éclat sur les verres.
  lunettes: {
    duree: 1.2,
    debut(c) {
      eclat(c, -c.cote * 0.28, -c.yeux, 10);
      c.scene.time.delayedCall(180, () => {
        if (c.calque.active) eclat(c, c.cote * 0.3, -c.yeux - 2, 7);
      });
    },
    maj(q, t, o, tete) {
      tete.dy -= cloche(q) * 4;
      tete.rot -= cloche(q) * 0.06;
    },
  },
  // Grand bâillement, tête en arrière.
  baille: {
    duree: 2,
    debut(c) {
      c.scene.time.delayedCall(350, () => {
        if (c.calque.active) mot(c, 'Ouaaah…', c.cote * 0.4, -c.sommet - 4, 17, '#fff4dc', -6);
      });
    },
    maj(q, t, o, tete) {
      const c = cloche(q / 0.85);
      tete.rot -= c * 0.32;
      tete.dy -= c * 5;
      o.rebond -= c * 0.01;
      if (q > 0.8) tete.dx += Math.sin(t * 40) * 2.5 * cloche((q - 0.8) / 0.2);
    },
  },
  // Petit coup de sifflet pour rien, par habitude.
  sifflote: {
    duree: 1.1,
    debut(c) {
      sifflet(c, false);
      mot(c, 'Tut !', c.cote * 0.9, -c.sommet + 4, 18, '#ffe066', -10);
    },
    maj(q, t, o, tete) {
      const c = plateau(q);
      tete.dx += Math.sin(t * 55) * 1.2 * c;
      tete.rot -= c * 0.06;
    },
  },
  // Les jumelles devant les yeux, il balaie l'horizon.
  jumelles: {
    duree: 2.6,
    debut(c) {
      const g = c.scene.add.graphics();
      forme(g, contourRond(-10, 0, 10, 3), { remplissage: 0x3a3a3a, trait: 3 });
      forme(g, contourRond(10, 0, 10, 4), { remplissage: 0x3a3a3a, trait: 3 });
      g.fillStyle(0x8fd3ff, 1);
      g.fillCircle(-10, 0, 5.5);
      g.fillCircle(10, 0, 5.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(-12, -2, 2);
      g.fillCircle(8, -2, 2);
      g.fillStyle(COULEURS.encre, 1);
      g.fillRect(-3, -4, 6, 8);
      const j = ajouter(c, g.setPosition(0, 40).setScale(0.6));
      c.scene.tweens.add({
        targets: j,
        y: -c.yeux,
        scale: 1,
        duration: 320,
        ease: 'Back.easeOut',
      });
      c.scene.tweens.add({ targets: j, delay: 2150, y: 40, duration: 380, ease: 'Quad.easeIn' });
      c.scene.time.delayedCall(1200, () => {
        if (c.calque.active) eclat(c, 12, -c.yeux - 4, 7);
      });
    },
    maj(q, t, o, tete) {
      const c = plateau(q, 0.15);
      const balaye = Math.sin(t * 2.4);
      tete.dx += balaye * 8 * c;
      tete.rot += balaye * 0.1 * c;
      o.regard = balaye > 0 ? 1 : -1;
    },
  },
  // Monsieur Yvon frime : menton levé, sourire qui brille.
  frime: {
    duree: 1.6,
    debut(c) {
      c.scene.time.delayedCall(300, () => {
        if (c.calque.active) eclat(c, c.cote * 0.35, -c.bouche + 4, 11);
      });
    },
    maj(q, t, o, tete) {
      const c = cloche(q);
      tete.rot -= c * 0.18;
      tete.dy -= c * 4;
      tete.echelle += c * 0.05;
      o.rebond -= c * 0.01;
    },
  },
  // Babette chante une chanson de veillée, en se balançant.
  chante: {
    duree: 3,
    debut(c) {
      for (let i = 0; i < 5; i++) note(c, c.cote * (0.45 + (i % 2) * 0.25), -c.bouche - 6, i * 480);
    },
    maj(q, t, o, tete) {
      const c = plateau(q, 0.1);
      tete.rot += Math.sin(t * 6) * 0.15 * c;
      tete.dy -= Math.abs(Math.sin(t * 6)) * 4 * c;
      o.tronc += Math.sin(t * 6) * 0.04 * c;
    },
  },
  // Babette compte ses scouts : 1, 2, 3, la tête qui pointe chacun.
  compte: {
    duree: 2.4,
    debut(c) {
      ['1', '2', '3'].forEach((n, i) => {
        c.scene.time.delayedCall(250 + i * 650, () => {
          if (!c.calque.active) return;
          const x = (i - 1) * c.cote * 0.9;
          mot(c, n, x, -c.sommet - 6, 24, '#fff4dc', (i - 1) * 10);
        });
      });
    },
    maj(q, t, o, tete) {
      const k = Math.min(2, Math.floor(((q * 2.4 - 0.25) / 0.65) | 0));
      const vise = q < 0.1 ? 0 : k - 1;
      tete.rot += vise * 0.16;
      tete.dx += vise * 5;
      o.regard = vise < 0 ? -1 : 1;
      tete.dy += Math.abs(Math.sin(t * 14)) * 2;
    },
  },

  /* Réactions au jeu : plus fortes, elles interrompent les tics. */

  // Coup de sifflet strident quand il change de goûter : joues rouges, tête qui vibre.
  sifflet: {
    duree: 1.4,
    debut(c) {
      sifflet(c, true);
      mot(c, 'TUUUT !', 0, -c.sommet - 14, 26, '#ffe066', -6);
    },
    maj(q, t, o, tete) {
      const c = plateau(q, 0.12);
      tete.dx += Math.sin(t * 70) * 2.2 * c;
      tete.rot -= c * 0.1;
      tete.echelle += c * 0.06;
      tete.rouge = Math.max(tete.rouge, c * 0.45);
    },
  },
  // Un élève envoyé chez la CPE : rouge de colère, fumée par les oreilles, « Grrr ! ».
  colere: {
    duree: 2,
    debut(c) {
      mot(c, 'Grrr !', 0, -c.sommet - 12, 24, '#ff6b5b', 6);
      for (let i = 0; i < 3; i++) {
        vapeur(c, -c.cote, -c.yeux + 4, 7, 150 + i * 380, -10);
        vapeur(c, c.cote, -c.yeux + 4, 7, 300 + i * 380, 10);
      }
    },
    maj(q, t, o, tete) {
      const c = plateau(q, 0.1);
      tete.dx += Math.sin(t * 48) * 3 * c;
      tete.rot += Math.sin(t * 31) * 0.06 * c;
      tete.echelle += c * 0.1;
      tete.rouge = Math.max(tete.rouge, c * (0.75 + Math.sin(t * 12) * 0.25));
      o.rebond += Math.sin(t * 40) * 0.004 * c;
    },
  },
  // Un goûter ramassé : sursaut, « ! ».
  surprise: {
    duree: 1.2,
    debut(c) {
      mot(c, '!', c.cote * 0.6, -c.sommet - 8, 40, '#ffe066', 10);
    },
    maj(q, t, o, tete) {
      const saut = q < 0.35 ? Math.sin((q / 0.35) * Math.PI) : 0;
      tete.dy -= saut * 16;
      tete.echelle += cloche(q / 0.5) * 0.12;
      if (q > 0.35) tete.rot += Math.sin(t * 25) * 0.05 * (1 - q);
    },
  },
  // Un plaquage sous son nez : « Hé ! », la tête qui recule, outrée.
  indigne: {
    duree: 1.5,
    debut(c) {
      mot(c, 'Hé !', c.cote * 0.5, -c.sommet - 10, 24, '#fff4dc', -10);
    },
    maj(q, t, o, tete) {
      const c = cloche(q);
      tete.rot -= c * 0.2;
      tete.dy -= c * 6;
      tete.dx -= c * 4;
      tete.rouge = Math.max(tete.rouge, c * 0.3);
      if (q > 0.4) tete.rot += Math.sin(t * 20) * 0.06 * c;
    },
  },
  // Arrivé à son nouveau goûter : petit hochement satisfait.
  content: {
    duree: 1,
    debut(c) {
      eclat(c, c.cote * 0.8, -c.sommet + 6, 8);
    },
    maj(q, t, o, tete) {
      tete.rot += Math.sin(q * Math.PI * 4) * 0.1 * cloche(q);
      tete.dy += Math.abs(Math.sin(q * Math.PI * 4)) * 3;
    },
  },
};

/* ------------------------------------------------------------------------------------------ */
/* Moteur commun : une marionnette, un calque qui suit sa tête, des tics                        */
/* ------------------------------------------------------------------------------------------ */

const sansAnimations = (): boolean =>
  (window as unknown as { __sansAnimations?: boolean }).__sansAnimations === true;

/** Teinte multiplicative : le trait noir reste noir, la peau rougit. */
function teinte(rouge: number): number {
  const v = Math.round(255 - rouge * 120);
  const b = Math.round(255 - rouge * 130);
  return (0xff << 16) | (v << 8) | b;
}

class Tetes {
  readonly calque: Phaser.GameObjects.Container;
  private tic: { tic: Tic; debut: number; ctx: Contexte } | null = null;
  private prochain: number;
  /** Côté où il regarde en dehors des tics (il se tourne vers où il marche). */
  regardBase = 1;
  private readonly visage: { yeux: number; bouche: number; sommet: number; cote: number };

  constructor(
    private readonly scene: Phaser.Scene,
    readonly m: Marionnette,
    /** Le conteneur où vivent la marionnette et le calque. */
    private readonly porteur: Phaser.GameObjects.Container,
    readonly id: IdSurveillant,
    /** Les tics qu'il peut faire de lui-même ; vide : seulement les réactions. */
    private readonly tics: NomTic[],
    private readonly force = 1,
  ) {
    this.calque = scene.add.container(0, 0);
    porteur.add(this.calque);
    const e = m.echelle;
    const v = VISAGES[id];
    const tete = m.rig.pieces.tete;
    this.visage = {
      yeux: v.yeux * e,
      bouche: v.bouche * e,
      sommet: tete.pivot[1] * e,
      cote: v.cote * e,
    };
    this.prochain = scene.time.now + 700 + Math.random() * 900;
  }

  reagir(r: Reaction | NomTic): void {
    if (sansAnimations()) return;
    this.finir();
    const ctx: Contexte = { scene: this.scene, calque: this.calque, objets: [], ...this.visage };
    const tic = TIC[r];
    this.tic = { tic, debut: this.scene.time.now, ctx };
    tic.debut?.(ctx);
  }

  private finir(): void {
    if (!this.tic) return;
    for (const o of this.tic.ctx.objets) o.destroy();
    this.tic = null;
  }

  /** Pose de base (venue de l'extérieur), complétée par le tic en cours ; place la tête. */
  maj(temps: number, pose: PoseMarionnette): void {
    const tete: Tete = { dx: 0, dy: 0, rot: 0, echelle: 1, rouge: 0 };
    pose.regard = this.regardBase;
    if (!sansAnimations()) {
      if (!this.tic && this.tics.length > 0 && temps > this.prochain) {
        const nom = this.tics[Math.floor(Math.random() * this.tics.length)] ?? 'scrute';
        this.reagir(nom);
      }
      if (this.tic) {
        const t = (temps - this.tic.debut) / 1000;
        const q = t / this.tic.tic.duree;
        if (q >= 1) {
          this.finir();
          this.prochain = temps + (1000 + Math.random() * 1600) / this.force;
        } else {
          this.tic.tic.maj(q, t, pose, tete, this.tic.ctx);
        }
      }
    }
    this.m.poser(pose);
    // La tête, par-dessus la pose : décalée, tournée, gonflée, rougie.
    const img = this.m.pieces.tete;
    const e = 1 / this.m.echelle;
    img.setPosition(img.x + tete.dx * e, img.y + tete.dy * e);
    img.setRotation(img.rotation + tete.rot);
    img.setScale(img.scaleX * tete.echelle, img.scaleY * tete.echelle);
    if (tete.rouge > 0.01) img.setTint(teinte(tete.rouge));
    else img.clearTint();
    // Le calque suit le cou.
    const mt = img.getWorldTransformMatrix();
    const mp = this.porteur.getWorldTransformMatrix();
    const local = mp.applyInverse(mt.tx, mt.ty);
    this.calque.setPosition(local.x, local.y);
    this.calque.setRotation(img.rotation + this.m.corps.rotation);
    this.porteur.bringToTop(this.calque);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Le médaillon sur la cour                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** Diamètre du cœur du médaillon (les pastilles d'élèves font 92). */
export const DIAMETRE_MEDAILLON = 100;

function rosette(r: number, dx = 0, dy = 0): P[] {
  const pts: P[] = [];
  const n = 112;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + 3 + 6 * (0.5 + 0.5 * Math.cos(a * 14)) + Math.sin(a * 5) * 0.6;
    pts.push({ x: dx + Math.cos(a) * rr, y: dy + Math.sin(a) * rr });
  }
  return pts;
}

export class MedaillonSurveillant {
  readonly racine: Phaser.GameObjects.Container;
  private readonly tetes: Tetes;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    rig: Rig,
    id: IdSurveillant,
    nom: string,
    diametre = DIAMETRE_MEDAILLON,
  ) {
    const r = diametre / 2;
    const C = COULEURS_SURVEILLANT;
    this.racine = scene.add.container(0, 0);
    // Les deux rubans qui pendent sous la rosette, comme une médaille de concours.
    const rubans = scene.add.graphics();
    for (const s of [-1, 1]) {
      const x0 = s * r * 0.2;
      const x1 = s * r * 0.72;
      const bas = r * 1.45;
      forme(
        rubans,
        [
          { x: x0 - s * 10, y: r * 0.3 },
          { x: x0 + s * 14, y: r * 0.3 },
          { x: x1 + s * 12, y: bas },
          { x: x1, y: bas - 10 },
          { x: x1 - s * 12, y: bas + 2 },
        ],
        { remplissage: s < 0 ? C.ruban : C.rubanOmbre, trait: 4 },
      );
    }
    const fond = scene.add.graphics();
    forme(fond, rosette(r), { remplissage: C.feston, trait: 4, ombre: 6 });
    forme(fond, contourRond(0, 0, r - 2, 41, 0.02), { remplissage: C.coeur, trait: 4 });
    // Rayons plus clairs derrière la tête : un projecteur, il est le chef ici.
    fond.fillStyle(C.coeurClair, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fond.slice(0, 0, r - 5, a, a + Math.PI / 10, false);
      fond.fillPath();
    }
    // La marionnette : la tête et les épaules, le cou un peu sous le milieu.
    const tete = rig.pieces.tete;
    const echelle = (diametre * 0.9) / tete.cadre[3];
    const m = new Marionnette(scene, texture, rig, echelle);
    m.racine.setY(r * 0.32 - tete.pos[1] * echelle);
    m.pieces.jambeG.setVisible(false);
    m.pieces.jambeD.setVisible(false);
    // Banderole du nom, par-dessus les rubans.
    const banderole = scene.add.container(0, r + 8);
    const t = scene.add
      .text(0, 0, nom, {
        fontFamily: POLICE,
        fontSize: '15px',
        fontStyle: '700',
        color: COULEURS.texteSombre,
      })
      .setOrigin(0.5);
    const l = t.width / 2 + 12;
    const gb = scene.add.graphics();
    for (const s of [-1, 1]) {
      forme(
        gb,
        [
          { x: s * (l - 4), y: -8 },
          { x: s * (l + 12), y: -6 },
          { x: s * (l + 6), y: 3 },
          { x: s * (l + 12), y: 12 },
          { x: s * (l - 4), y: 10 },
        ],
        { remplissage: C.rubanOmbre, trait: 3 },
      );
    }
    forme(
      gb,
      [
        { x: -l, y: -12 },
        { x: 0, y: -15 },
        { x: l, y: -12 },
        { x: l, y: 11 },
        { x: 0, y: 8 },
        { x: -l, y: 11 },
      ],
      { remplissage: C.banderole, trait: 3 },
    );
    banderole.add([gb, t]);
    this.racine.add([rubans, fond, m.racine, banderole]);
    // Le corps est coupé au bord du cœur, libre au-dessus : la tête dépasse.
    const masque = masqueQuiSuit(scene, this.racine, (g) => {
      g.fillCircle(0, 0, r - 4);
      g.fillRect(-r * 2, -r * 4, r * 4, r * 4);
    });
    for (const p of ['tronc', 'brasG', 'brasD', 'tete'] as const) m.pieces[p].setMask(masque);
    for (const x of Object.values(m.extras)) x?.setMask(masque);
    this.racine.bringToTop(banderole);
    this.tetes = new Tetes(scene, m, this.racine, id, TICS[id], 1.2);
    // La vie : respiration, tête qui dodeline ; les tics par-dessus.
    const phase = Math.random() * 10;
    const maj = (temps: number): void => {
      if (!this.racine.active) return;
      const s = temps / 1000 + phase;
      const pose = poseRepos();
      if (!sansAnimations()) {
        pose.rebond = Math.sin(s * 2.1) * 0.006;
        pose.tete = Math.sin(s * 1.3) * 0.07;
        pose.tronc = Math.sin(s * 0.9) * 0.02;
      }
      this.tetes.maj(temps, pose);
      this.racine.bringToTop(banderole);
    };
    maj(scene.time.now);
    scene.events.on(Phaser.Scenes.Events.UPDATE, maj);
    this.racine.once(Phaser.GameObjects.Events.DESTROY, () =>
      scene.events.off(Phaser.Scenes.Events.UPDATE, maj),
    );
  }

  reagir(r: Reaction): void {
    this.tetes.reagir(r);
  }

  /** Il se tourne vers où il va (−1 : à gauche de l'écran). */
  regarder(cote: number): void {
    this.tetes.regardBase = cote < 0 ? -1 : 1;
  }
}

/** Masque géométrique qui suit son porteur (même principe que les pastilles d'élèves). */
function masqueQuiSuit(
  scene: Phaser.Scene,
  porteur: Phaser.GameObjects.Container,
  dessin: (g: Phaser.GameObjects.Graphics) => void,
): Phaser.Display.Masks.GeometryMask {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff, 1);
  dessin(g);
  const masque = g.createGeometryMask();
  const suivre = (): void => {
    const m = porteur.getWorldTransformMatrix();
    g.setPosition(m.tx, m.ty).setRotation(m.rotation).setScale(m.scaleX, m.scaleY);
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, suivre);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, suivre);
    masque.destroy();
    g.destroy();
  });
  suivre();
  return masque;
}

/* ------------------------------------------------------------------------------------------ */
/* En pied, pour présenter la carte                                                            */
/* ------------------------------------------------------------------------------------------ */

type Temps = 'arrive' | 'siffle' | 'montre' | 'attend' | 'range';

/**
 * Le surveillant en entier : il entre en marchant depuis le bord, s'arrête, siffle, montre la
 * règle du bras (vers la droite de l'écran), puis s'agite en attendant qu'on lance la partie.
 * `ranger` le fait sauter jusqu'à sa place sur la cour en rapetissant.
 */
export class SurveillantEnPied {
  readonly racine: Phaser.GameObjects.Container;
  private readonly m: Marionnette;
  private readonly tetes: Tetes;
  private temps: Temps = 'arrive';
  private debutTemps: number;
  /** Prochain geste d'attente, et celui en cours. */
  private geste: { nom: 'montre' | 'gronde' | 'tape' | 'saute'; debut: number } | null = null;
  private prochain = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    texture: string,
    rig: Rig,
    id: IdSurveillant,
    hauteur: number,
    x: number,
    y: number,
    private readonly onSiffle?: () => void,
    /** false : il est déjà là (écran redessiné), pas d'entrée en marchant. */
    entrer = true,
  ) {
    this.m = new Marionnette(scene, texture, rig, hauteur / rig.hauteur);
    const ombre = scene.add.ellipse(0, 4, hauteur * 0.42, hauteur * 0.07, COULEURS.encre, 0.28);
    this.racine = scene.add.container(x, y, [ombre, this.m.racine]);
    this.tetes = new Tetes(scene, this.m, this.racine, id, [], 1);
    this.debutTemps = scene.time.now;
    const arrivee = x;
    if (sansAnimations() || !entrer) {
      this.temps = 'attend';
    } else {
      this.racine.x = -hauteur * 0.5;
      scene.tweens.add({
        targets: this.racine,
        x: arrivee,
        duration: 1100,
        ease: 'Sine.easeOut',
        onComplete: () => this.passer('siffle'),
      });
    }
    const maj = (temps: number): void => {
      if (!this.racine.active) return;
      this.maj(temps);
    };
    maj(scene.time.now);
    scene.events.on(Phaser.Scenes.Events.UPDATE, maj);
    this.racine.once(Phaser.GameObjects.Events.DESTROY, () =>
      scene.events.off(Phaser.Scenes.Events.UPDATE, maj),
    );
  }

  private passer(t: Temps): void {
    this.temps = t;
    this.debutTemps = this.scene.time.now;
    if (t === 'siffle') {
      this.tetes.reagir('sifflet');
      this.onSiffle?.();
    }
  }

  private maj(temps: number): void {
    const s = (temps - this.debutTemps) / 1000;
    const pose = poseRepos();
    const vie = temps / 1000;
    pose.rebond = Math.sin(vie * 2.2) * 0.006;
    pose.tronc = Math.sin(vie * 0.9) * 0.015;
    switch (this.temps) {
      case 'arrive': {
        // Marche décidée, à grandes enjambées, le buste en avant.
        const w = s * 11;
        pose.jambeG = Math.sin(w) * 0.42;
        pose.jambeD = -Math.sin(w) * 0.42;
        pose.brasG = -Math.sin(w) * 0.5;
        pose.brasD = -Math.sin(w) * 0.5;
        pose.rebond = -Math.abs(Math.cos(w)) * 0.025;
        pose.tronc = 0.06;
        pose.tete = Math.sin(w * 2) * 0.04;
        break;
      }
      case 'siffle': {
        // Planté, un petit saut sur place au coup de sifflet, les bras écartés.
        const q = Math.min(1, s / 1.3);
        pose.saut = -Math.sin(Math.min(1, s / 0.35) * Math.PI) * 0.05;
        pose.brasG = cloche(q) * 0.9;
        pose.brasD = -cloche(q) * 0.9;
        if (s > 1.3) this.passer('montre');
        break;
      }
      case 'montre': {
        // Le bras se tend vers la règle, l'index pointé, et y insiste trois fois.
        const q = Math.min(1, s / 0.4);
        pose.brasD = -q * 1.1 - Math.sin(s * 14) * 0.12 * q;
        pose.coudeD = q * 1.5;
        pose.tronc = q * 0.06;
        pose.tete = q * 0.1 + Math.abs(Math.sin(s * 7)) * 0.06;
        pose.brasG = q * 0.3;
        if (s > 1.6) {
          this.passer('attend');
          this.prochain = temps + 900;
        }
        break;
      }
      case 'attend': {
        // En attendant qu'on lance la partie : il montre encore la règle, gronde du doigt, tape
        // du pied, ou saute d'impatience.
        if (!sansAnimations()) {
          if (!this.geste && temps > this.prochain) {
            const noms = ['montre', 'gronde', 'tape', 'montre', 'saute'] as const;
            this.geste = {
              nom: noms[Math.floor(Math.random() * noms.length)] ?? 'montre',
              debut: temps,
            };
          }
          if (this.geste) {
            const g = (temps - this.geste.debut) / 1000;
            const fini = this.attendre(this.geste.nom, g, pose);
            if (fini) {
              this.geste = null;
              this.prochain = temps + 500 + Math.random() * 900;
            }
          }
        }
        break;
      }
      case 'range': {
        pose.saut = -0.06;
        pose.brasG = 1.4;
        pose.brasD = -1.4;
        pose.jambeG = 0.3;
        pose.jambeD = -0.3;
        break;
      }
    }
    this.tetes.maj(temps, pose);
  }

  /** Un geste d'attente ; renvoie true quand il est fini. */
  private attendre(
    nom: 'montre' | 'gronde' | 'tape' | 'saute',
    g: number,
    o: PoseMarionnette,
  ): boolean {
    switch (nom) {
      case 'montre': {
        const q = cloche(g / 1.4);
        o.brasD -= q * 1.1 + Math.sin(g * 14) * 0.12 * q;
        o.coudeD += q * 1.5;
        o.tronc += q * 0.05;
        if (g < 0.05) this.tetes.reagir('sifflote');
        return g > 1.4;
      }
      case 'gronde': {
        // L'index levé qui s'agite : « Pas de bêtises ! »
        const q = cloche(g / 1.5);
        o.brasG += q * 2.3 + Math.sin(g * 18) * 0.2 * q;
        o.coudeG += q * 1.2;
        o.tete -= q * 0.08;
        if (g < 0.05) this.tetes.reagir('indigne');
        return g > 1.5;
      }
      case 'tape': {
        // Les poings sur les hanches, il tape du pied : on y va, oui ?
        const q = cloche(g / 1.6);
        o.brasG += q * 0.55;
        o.brasD -= q * 0.55;
        o.jambeD -= Math.max(0, Math.sin(g * 14)) * 0.25 * q;
        o.tete += Math.sin(g * 7) * 0.05 * q;
        if (g < 0.05) this.tetes.reagir('soupcon');
        return g > 1.6;
      }
      case 'saute': {
        const q = cloche(g / 0.6);
        o.saut -= q * 0.14;
        o.jambeG += q * 0.3;
        o.jambeD -= q * 0.3;
        o.brasG += q * 1.8;
        o.brasD -= q * 1.8;
        return g > 0.6;
      }
    }
  }

  /** Il saute jusqu'à `vers` en rapetissant à `echelleFin`, puis disparaît ; `fini` ensuite. */
  ranger(vers: P, echelleFin: number, fini: () => void): void {
    if (sansAnimations()) {
      fini();
      return;
    }
    this.passer('range');
    const depart = { x: this.racine.x, y: this.racine.y };
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 520,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        this.racine.setPosition(
          depart.x + (vers.x - depart.x) * v,
          depart.y + (vers.y - depart.y) * v - Math.sin(v * Math.PI) * 160,
        );
        this.racine.setScale(1 + (echelleFin - 1) * v);
        this.racine.setAngle(Math.sin(v * Math.PI) * -12);
      },
      onComplete: () => {
        this.racine.destroy();
        fini();
      },
    });
  }
}
