/**
 * Le Grand et le Petit sur l'accueil : une petite troupe de cartoon. Ils entrent en scène, puis
 * jouent à tour de rôle de courts sketchs muets (le Petit qui saute pour être aussi grand, le
 * « check », la chute, le copieur), entrecoupés d'attentes où le Petit dit le but du jeu dans
 * sa bulle. Touchés, ils réagissent : le Grand sursaute, le Petit fait un salto.
 *
 * Tout est calculé à chaque image à partir du temps : une pose de base, à laquelle le sketch en
 * cours et la réaction au toucher ajoutent leurs mouvements. Le dessin n'est jamais déformé :
 * seules les pièces des marionnettes tournent et se déplacent.
 */
import Phaser from 'phaser';
import { COULEURS, DROITE, GAUCHE, POLICE_TITRE } from '../config';
import { jouerSon } from '../sons';
import type { Acteur } from '../skins/types';
import { poseRepos, type PoseMarionnette } from './marionnette';
import { contourRond, forme, type P } from './style';

/** État d'un acteur à un instant : pose des membres, déplacement et rotations. */
interface Etat {
  pose: PoseMarionnette;
  /** Décalage depuis sa place, en pixels. */
  dx: number;
  /** Hauteur de saut (négatif vers le haut), en pixels. */
  dy: number;
  /** Bascule autour des pieds (chute), en radians. */
  bascule: number;
  /** Vrille autour du milieu du corps (salto), en radians. */
  vrille: number;
}

const etatRepos = (): Etat => ({ pose: poseRepos(), dx: 0, dy: 0, bascule: 0, vrille: 0 });

/* Petits outils de temps. */
const borne = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Avancement de 0 à 1 entre `debut` et `fin`. */
const entre = (t: number, debut: number, fin: number) => borne((t - debut) / (fin - debut));
const doux = (q: number) => q * q * (3 - 2 * q);
const sortie = (q: number) => 1 - (1 - q) * (1 - q);
const cloche = (q: number) => Math.sin(borne(q) * Math.PI);
/** Saut parabolique de hauteur `h` entre `debut` et `fin` (négatif : vers le haut). */
const saut = (t: number, debut: number, fin: number, h: number) => {
  if (t <= debut || t >= fin) return 0;
  const q = (t - debut) / (fin - debut);
  return -h * 4 * q * (1 - q);
};
/** Dépasse un peu avant de se poser, comme un ressort. */
const ressort = (q: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2);
};

/** Marche ou course : jambes et bras qui balancent, petits rebonds. */
function marche(e: Etat, phase: number, amp: number, rebond: number): void {
  // Vu de face : une jambe puis l'autre se lève vers l'extérieur, le bras opposé balance.
  const s = Math.sin(phase);
  e.pose.jambeG += Math.max(0, s) * amp;
  e.pose.jambeD -= Math.max(0, -s) * amp;
  e.pose.brasD -= Math.max(0, s) * amp * 1.2;
  e.pose.brasG += Math.max(0, -s) * amp * 1.2;
  e.dy -= Math.abs(Math.cos(phase)) * rebond;
}

/** Bras en V, vers le ciel. */
function brasEnL_Air(e: Etat, q: number, amp = 2.4): void {
  e.pose.brasG += q * amp;
  e.pose.brasD -= q * amp;
}

/* ------------------------------------------------------------------------------------------ */

interface Sketch {
  duree: number;
  jouer(t: number, grand: Etat, petit: Etat): void;
  /** Moments ponctuels (effets, sons), en secondes depuis le début du sketch. */
  moments?: [number, (d: DuoAccueil) => void][];
}

/** Les sketchs, joués dans l'ordre, en boucle. */
const SKETCHS: Sketch[] = [
  // « Moi aussi je suis grand ! » : trois sauts de plus en plus hauts, le Grand applaudit.
  {
    duree: 4.4,
    jouer(t, g, p) {
      const sauts: [number, number, number][] = [
        [0.3, 0.8, 45],
        [1.15, 1.75, 95],
        [2.15, 3.05, 165],
      ];
      let elan = 0;
      for (const [a, b, h] of sauts) {
        p.dy += saut(t, a, b, h);
        elan = Math.max(elan, cloche(entre(t, a - 0.1, b)));
        // Il s'accroupit avant chaque saut.
        p.pose.rebond += cloche(entre(t, a - 0.18, a + 0.02)) * 0.025;
      }
      brasEnL_Air(p, elan, 2.6);
      p.pose.jambeG += elan * 0.3;
      p.pose.jambeD -= elan * 0.3;
      p.pose.tete -= 0.2 * cloche(entre(t, 0, 3.2));
      // Le Grand suit le Petit des yeux, puis applaudit le dernier saut.
      const hauteur = -p.dy / 165;
      g.pose.tete += 0.12 + hauteur * 0.25;
      g.pose.tronc += hauteur * 0.06;
      const bravo = cloche(entre(t, 3.15, 4.3));
      g.pose.brasG += bravo * (1.1 + Math.sin(t * 28) * 0.3);
      g.pose.brasD -= bravo * (1.1 + Math.sin(t * 28) * 0.3);
      // Le Petit, fier, bombe le torse.
      const fier = cloche(entre(t, 3.1, 4.4));
      p.pose.brasG += fier * 0.5;
      p.pose.brasD -= fier * 0.5;
      p.pose.tete -= fier * 0.25;
    },
    moments: [
      [0.8, (d) => d.poussiere('petit')],
      [1.75, (d) => d.poussiere('petit')],
      [2.6, (d) => d.eclat(d.tete('petit', -30), 'Hop !', 0.8)],
      [3.05, (d) => d.poussiere('petit', true)],
    ],
  },
  // Le « check » : ils se rejoignent, tapent dans la main, et reculent sous le choc.
  {
    duree: 3.6,
    jouer(t, g, p) {
      const aller = doux(entre(t, 0, 0.65));
      const retour = doux(entre(t, 1.9, 2.7));
      const pas = aller - retour;
      g.dx += pas * 52;
      p.dx -= pas * 52;
      const marcheG = cloche(entre(t, 0, 0.65)) + cloche(entre(t, 1.9, 2.7));
      marche(g, t * 11, 0.3 * marcheG, 5 * marcheG);
      marche(p, t * 15, 0.45 * marcheG, 8 * marcheG);
      // Élan, puis la main levée l'une vers l'autre.
      const leve = doux(entre(t, 0.55, 0.95)) * (1 - doux(entre(t, 1.3, 1.7)));
      g.pose.brasD -= leve * 2.5;
      g.pose.tronc += leve * 0.08;
      p.pose.brasG += leve * 2.7;
      p.dy += saut(t, 0.75, 1.35, 70);
      // Le choc : chacun part en arrière.
      const choc = cloche(entre(t, 1.05, 1.55));
      g.pose.tronc -= choc * 0.2;
      g.pose.tete -= choc * 0.2;
      p.pose.tronc += choc * 0.3;
      p.dx += choc * 14;
    },
    moments: [
      [1.05, (d) => d.eclat(d.entreLesDeux(), 'Paf !', 1.15, true)],
      [1.35, (d) => d.poussiere('petit')],
    ],
  },
  // La chute : le Petit court sur place pour frimer, se prend les pieds, le Grand rit.
  {
    duree: 5,
    jouer(t, g, p) {
      const course = 1 - entre(t, 1.05, 1.15);
      marche(p, t * 24, 0.75 * course, 12 * course);
      p.pose.tronc -= 0.08 * course;
      // Il trébuche et tombe de tout son long, vers le Grand.
      const tombe = t < 1.1 ? 0 : t < 1.45 ? Math.pow(entre(t, 1.1, 1.45), 2) : 1;
      const releve = ressort(entre(t, 3, 3.45));
      const rebond = 0.12 * cloche(entre(t, 1.45, 1.65));
      p.bascule -= (1.5 - rebond) * tombe * (1 - (t >= 3 ? releve : 0));
      // Au sol, les jambes gigotent.
      const sol = entre(t, 1.5, 1.6) * (1 - entre(t, 2.9, 3));
      p.pose.jambeG += Math.sin(t * 16) * 0.25 * sol;
      p.pose.jambeD -= Math.sin(t * 16 + 1) * 0.25 * sol;
      p.pose.brasD -= sol * 1.2;
      p.pose.brasG += sol * 0.4;
      // Debout ! Petit bond, bras en l'air : « même pas mal ».
      p.dy += saut(t, 3.05, 3.5, 40);
      const tada = cloche(entre(t, 3.1, 4.2));
      brasEnL_Air(p, tada, 2.5);
      // Il s'époussette en secouant la tête.
      p.pose.tete += Math.sin(t * 18) * 0.15 * cloche(entre(t, 4.1, 5));
      // Le Grand se tord de rire, la tête en arrière, les mains sur le ventre.
      const rire = cloche(entre(t, 1.35, 3.2));
      g.pose.tete -= rire * 0.3;
      g.pose.tronc += Math.sin(t * 22) * 0.035 * rire - rire * 0.06;
      g.pose.brasG -= rire * 0.35;
      g.pose.brasD += rire * 0.35;
      g.pose.rebond += Math.abs(Math.sin(t * 22)) * 0.012 * rire;
    },
    moments: [
      [1.45, (d) => d.poussiere('petit', true, -70)],
      [1.6, (d) => d.texte('grand', 'Ha ! Ha !')],
      [1.6, (d) => d.tournis(1.3)],
      [2.3, (d) => d.texte('grand', 'Ha ! Ha !')],
      [3.5, (d) => d.poussiere('petit')],
    ],
  },
  // Le copieur : le Grand prend des poses, le Petit les imite avec un temps de retard, et finit
  // en vrille pour avoir le dernier mot.
  {
    duree: 4.6,
    jouer(t, g, p) {
      poseDuCopieur(g, t);
      poseDuCopieur(p, t - 0.35);
      p.dy += saut(t, 3.5, 4.3, 120);
      p.vrille += doux(entre(t, 3.55, 4.25)) * Math.PI * 2;
      // Vexé, le Grand croise les bras et détourne la tête.
      const vexe = doux(entre(t, 3.9, 4.2)) * (1 - doux(entre(t, 4.4, 4.6)));
      g.pose.brasG -= vexe * 0.5;
      g.pose.brasD += vexe * 0.5;
      g.pose.tete -= vexe * 0.22;
    },
    moments: [
      [4.3, (d) => d.poussiere('petit', true)],
      [4.3, (d) => d.eclat(d.tete('petit', -50), 'Tadaa !', 0.9)],
    ],
  },
];

/** Les quatre poses du copieur, une toutes les 0,75 s, enchaînées en souplesse. */
const POSES_COPIEUR: Partial<Omit<PoseMarionnette, 'regard'>>[] = [
  { brasG: 2.4, brasD: -2.4 },
  { brasG: 2.7, brasD: 0.2, tronc: 0.12, tete: 0.15 },
  { brasG: -0.2, brasD: -2.7, tronc: -0.12, tete: -0.15 },
  { brasG: 0.55, brasD: -0.55, tete: -0.18, jambeG: 0.2, jambeD: -0.2 },
];
function poseDuCopieur(e: Etat, t: number): void {
  if (t < 0.15) return;
  const u = (t - 0.15) / 0.75;
  const k = Math.min(POSES_COPIEUR.length - 1, Math.floor(u));
  const fin = t > 3.4 ? 1 - doux(entre(t, 3.4, 3.7)) : 1;
  const debut = doux(entre(t, 0.15, 0.3));
  const avant = POSES_COPIEUR[k - 1] ?? {};
  const cible = POSES_COPIEUR[k] ?? {};
  const m = doux(borne((u - k) / 0.22));
  for (const cle of ['brasG', 'brasD', 'tronc', 'tete', 'jambeG', 'jambeD'] as const) {
    const v = (avant[cle] ?? 0) + ((cible[cle] ?? 0) - (avant[cle] ?? 0)) * m;
    e.pose[cle] += v * fin * debut;
  }
  // Un petit sautillement à chaque nouvelle pose.
  e.dy += saut(u - k, 0, 0.3, 14) * fin;
}

/* ------------------------------------------------------------------------------------------ */

type Qui = 'grand' | 'petit';

interface Role {
  acteur: Acteur;
  x: number;
  ombre: Phaser.GameObjects.Ellipse;
  etat: Etat;
  /** Réaction au toucher en cours : son début (temps de scène, ms). */
  reaction: number | null;
}

/** Attente entre deux sketchs (la bulle est alors affichée), en secondes. */
const ATTENTE = 4.2;
/** Durée de l'entrée en scène, en secondes. */
const ENTREE = 2.6;

export class DuoAccueil {
  private readonly roles: Record<Qui, Role>;
  /**
   * Horloge propre au duo, en secondes. Elle avance d'au plus 1/20 s par image : quand le
   * téléphone rame au démarrage, l'entrée en scène n'est pas sautée.
   */
  private horloge = 0;
  private sketch = -1;
  private debutSketch = 0;
  private momentsFaits = 0;
  private bulleVisible = false;
  private readonly etoiles: Phaser.GameObjects.Graphics;
  private tournisJusqua = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    grand: Acteur,
    petit: Acteur,
    xGrand: number,
    xPetit: number,
    private readonly sol: number,
    /** Bulle du Petit, origine à sa pointe : elle sort et rentre de sa tête. */
    private readonly bulle: Phaser.GameObjects.Container,
  ) {
    const role = (acteur: Acteur, x: number, largeurOmbre: number): Role => {
      const ombre = scene.add.ellipse(
        x,
        sol,
        largeurOmbre,
        largeurOmbre * 0.17,
        COULEURS.encre,
        0.2,
      );
      scene.children.moveBelow(ombre, acteur.objet);
      return { acteur, x, ombre, etat: etatRepos(), reaction: null };
    };
    this.roles = { grand: role(grand, xGrand, 130), petit: role(petit, xPetit, 110) };
    this.etoiles = scene.add.graphics().setDepth(5);
    bulle.setScale(0);

    for (const qui of ['grand', 'petit'] as const) {
      const { acteur } = this.roles[qui];
      const l = acteur.hauteur * 0.5;
      acteur.objet
        .setSize(l, acteur.hauteur)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, -acteur.hauteur / 2, l, acteur.hauteur),
          Phaser.Geom.Rectangle.Contains,
        );
      acteur.objet.on('pointerup', () => this.toucher(qui));
    }

    const sansAnimations = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
    if (sansAnimations) {
      this.placer(this.roles.grand);
      this.placer(this.roles.petit);
      this.afficherBulle(true);
      return;
    }
    const maj = (_temps: number, delta: number): void => {
      this.horloge += Math.min(delta, 50) / 1000;
      this.maj();
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, maj);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.events.off(Phaser.Scenes.Events.UPDATE, maj),
    );
  }

  private maj(): void {
    const t = this.horloge;
    const g = etatRepos();
    const p = etatRepos();
    this.attente(t, g, p);

    if (t < ENTREE) {
      this.entree(t, g, p);
    } else {
      // Attente (bulle affichée), puis le sketch suivant.
      const ts = t - this.debutSketch;
      const enCours = this.sketch >= 0 ? SKETCHS[this.sketch] : undefined;
      if (enCours && ts < enCours.duree) {
        enCours.jouer(ts, g, p);
        const moments = enCours.moments ?? [];
        while (this.momentsFaits < moments.length) {
          const moment = moments[this.momentsFaits];
          if (!moment || moment[0] > ts) break;
          moment[1](this);
          this.momentsFaits++;
        }
        this.afficherBulle(false);
      } else {
        this.afficherBulle(true);
        const finAttente = (enCours ? this.debutSketch + enCours.duree : ENTREE) + ATTENTE;
        if (t > finAttente) {
          this.sketch = (this.sketch + 1) % SKETCHS.length;
          this.debutSketch = t;
          this.momentsFaits = 0;
        }
      }
    }

    this.roles.grand.etat = g;
    this.roles.petit.etat = p;
    this.reagir('grand');
    this.reagir('petit');
    this.placer(this.roles.grand);
    this.placer(this.roles.petit);
    this.dessinerTournis();
  }

  /** Mouvement de fond : le Grand nonchalant, le Petit qui ne tient pas en place. */
  private attente(t: number, g: Etat, p: Etat): void {
    g.pose.rebond = Math.sin(t * 1.6) * 0.006;
    g.pose.tronc = Math.sin(t * 0.9) * 0.04;
    const ballant = Math.sin(t * 0.9 + 1) * 0.12;
    g.pose.brasG = ballant - g.pose.tronc;
    g.pose.brasD = ballant * 0.8 - g.pose.tronc;
    g.pose.tete = 0.08 + Math.sin(t * 0.6 + 2) * 0.05;
    // De temps en temps, il tape du pied en rythme.
    const rythme = cloche(entre(t % 7, 4.5, 6.5));
    g.pose.jambeD -= Math.max(0, Math.sin(t * 9)) * 0.14 * rythme;

    p.dy = -Math.abs(Math.sin(t * 5)) * 9;
    p.pose.tronc = Math.sin(t * 2.6) * 0.06;
    p.pose.brasG = 0.25 + Math.sin(t * 10) * 0.22;
    p.pose.brasD = -0.25 - Math.sin(t * 10 + 1) * 0.22;
    p.pose.tete = Math.sin(t * 2.6 + 1) * 0.08;
  }

  /** Le Grand arrive en marchant, le Petit en courant puis d'un grand bond ; « ta-daa ». */
  private entree(t: number, g: Etat, p: Etat): void {
    const rg = this.roles.grand;
    const rp = this.roles.petit;
    const departG = GAUCHE - 90 - rg.x;
    const arriveG = sortie(entre(t, 0, 1.4));
    g.dx += departG * (1 - arriveG);
    marche(g, t * 10, 0.32 * (1 - entre(t, 1.2, 1.4)), 6 * (1 - arriveG));

    const departP = DROITE + 80 - rp.x;
    const course = entre(t, 0.35, 1.2);
    const bond = doux(entre(t, 1.2, 1.7));
    p.dx += departP * (1 - course) + 70 * course * (1 - bond);
    marche(p, t * 22, 0.7 * (1 - entre(t, 1.1, 1.2)), 12 * (1 - course));
    p.dy += saut(t, 1.2, 1.7, 130);
    p.vrille -= doux(entre(t, 1.22, 1.68)) * Math.PI * 2;
    const tada = cloche(entre(t, 1.75, 2.6));
    brasEnL_Air(p, tada, 2.6);
    g.pose.brasD -= tada * 2.3; // le Grand, plus cool, ne lève qu'un bras
    g.pose.tete -= tada * 0.1;

    if (this.momentsFaits === 0 && t > 1.7) {
      this.momentsFaits = 1;
      this.poussiere('petit', true);
      this.eclat(this.tete('petit', -40), 'Tadaa !', 0.9);
    }
  }

  /** Réaction au toucher, ajoutée à la pose en cours. */
  private reagir(qui: Qui): void {
    const r = this.roles[qui];
    if (r.reaction === null) return;
    const t = (this.scene.time.now - r.reaction) / 1000;
    const e = r.etat;
    if (qui === 'grand') {
      // Sursaut : il bondit, bras et jambes écartés, puis se remet en place.
      e.dy += saut(t, 0, 0.5, 60);
      const q = cloche(entre(t, 0, 0.7));
      brasEnL_Air(e, q, 2);
      e.pose.jambeG += q * 0.35;
      e.pose.jambeD -= q * 0.35;
      e.pose.tete -= q * 0.15;
      if (t > 0.8) r.reaction = null;
    } else {
      // Salto.
      e.dy += saut(t, 0.08, 0.83, 130);
      e.vrille += doux(entre(t, 0.12, 0.8)) * Math.PI * 2;
      brasEnL_Air(e, cloche(entre(t, 0, 0.9)), 2.6);
      e.pose.rebond += cloche(entre(t, 0, 0.12)) * 0.03;
      if (t > 0.83 && r.reaction !== null) {
        r.reaction = null;
        this.poussiere('petit', true);
      }
    }
  }

  private toucher(qui: Qui): void {
    const r = this.roles[qui];
    if (r.reaction !== null) return;
    r.reaction = this.scene.time.now;
    if (qui === 'grand') {
      jouerSon('prise');
      this.eclat(this.tete('grand', -40), '!', 0.75);
    } else {
      jouerSon('glissade');
    }
  }

  /** Place l'acteur et son ombre d'après son état. */
  private placer(r: Role): void {
    const { acteur, etat: e } = r;
    acteur.poser(e.pose);
    const h = acteur.hauteur;
    const pieds = { x: r.x + e.dx, y: this.sol + e.dy };
    // Bascule autour des pieds, vrille autour du milieu du corps.
    const centre = {
      x: pieds.x + Math.sin(e.bascule) * (h / 2),
      y: pieds.y - Math.cos(e.bascule) * (h / 2),
    };
    const angle = e.bascule + e.vrille;
    acteur.objet
      .setPosition(centre.x - Math.sin(angle) * (h / 2), centre.y + Math.cos(angle) * (h / 2))
      .setRotation(angle);
    // L'ombre reste au sol : plus petite et plus pâle quand il saute, allongée quand il est couché.
    const haut = borne(-e.dy / 220, 0, 0.6);
    r.ombre
      .setPosition(r.x + e.dx + Math.sin(e.bascule) * h * 0.45, this.sol)
      .setScale((1 - haut) * (1 + Math.abs(Math.sin(e.bascule)) * 1.2), 1 - haut)
      .setAlpha(1 - haut);
  }

  private afficherBulle(visible: boolean): void {
    if (visible === this.bulleVisible) return;
    this.bulleVisible = visible;
    this.scene.tweens.killTweensOf(this.bulle);
    this.scene.tweens.add({
      targets: this.bulle,
      scale: visible ? 1 : 0,
      duration: visible ? 380 : 180,
      ease: visible ? 'Back.easeOut' : 'Quad.easeIn',
    });
  }

  /* ---------------------------------- Effets ---------------------------------- */

  /** Haut de la tête d'un acteur (en tenant compte de sa bascule), décalé de `dy`. */
  tete(qui: Qui, dy = 0): P {
    const r = this.roles[qui];
    const h = r.acteur.hauteur;
    const a = r.etat.bascule;
    return {
      x: r.x + r.etat.dx + Math.sin(a) * h,
      y: this.sol + r.etat.dy - Math.cos(a) * h + dy,
    };
  }

  entreLesDeux(): P {
    const g = this.tete('grand');
    const p = this.tete('petit');
    return { x: (g.x + p.x) / 2, y: g.y + 30 };
  }

  /** Petits nuages de poussière aux pieds (ou là où il est tombé). */
  poussiere(qui: Qui, fort = false, decalage = 0): void {
    const r = this.roles[qui];
    const x = r.x + r.etat.dx + decalage;
    const n = fort ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const cote = i % 2 === 0 ? -1 : 1;
      const g = this.scene.add.graphics({ x: x + cote * 12, y: this.sol - 6 }).setDepth(4);
      const rayon = 9 + (i % 3) * 3;
      forme(g, contourRond(0, 0, rayon, i + 1, 0.12), {
        remplissage: COULEURS.papier,
        trait: 3,
      });
      g.setScale(0.4);
      this.scene.tweens.add({
        targets: g,
        x: x + cote * (30 + i * 9) * (fort ? 1.5 : 1),
        y: this.sol - 10 - (i % 3) * 9,
        scale: fort ? 1.3 : 1,
        alpha: 0,
        duration: 520 + i * 40,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  /** Étoile d'impact jaune au trait noir, avec une onomatopée. */
  eclat(o: P, texte: string, echelle = 1, secousse = false): void {
    const g = this.scene.add.graphics();
    const pts: P[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = i % 2 === 0 ? 62 : 34 + (i % 4) * 2;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    forme(g, pts, { remplissage: COULEURS.jaune, trait: 4, ombre: 5 });
    const mot = this.scene.add
      .text(0, 0, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: texte.length > 3 ? '26px' : '38px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const c = this.scene.add
      .container(o.x, o.y, [g, mot])
      .setDepth(6)
      .setScale(0)
      .setAngle(Phaser.Math.Between(-15, 15));
    this.scene.tweens.add({
      targets: c,
      scale: echelle,
      duration: 220,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: c,
      scale: 0,
      alpha: 0,
      delay: 650,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => c.destroy(),
    });
    if (secousse) this.scene.cameras.main.shake(140, 0.006);
  }

  /** Texte qui sort de la tête et s'envole (« Ha ! Ha ! »). */
  texte(qui: Qui, texte: string): void {
    const o = this.tete(qui, -16);
    const t = this.scene.add
      .text(o.x + Phaser.Math.Between(-30, 30), o.y, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: '30px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        stroke: '#fff4dc',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setScale(0)
      .setAngle(Phaser.Math.Between(-12, 12));
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: o.y - 60,
      alpha: 0,
      delay: 300,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  /** Étoiles qui tournent au-dessus de la tête du Petit, sonné. */
  tournis(duree: number): void {
    this.tournisJusqua = this.scene.time.now + duree * 1000;
  }

  private dessinerTournis(): void {
    const g = this.etoiles;
    g.clear();
    if (this.scene.time.now > this.tournisJusqua) return;
    const r = this.roles.petit;
    const h = r.acteur.hauteur;
    const a = r.etat.bascule;
    // La tête du Petit couché : au bout du corps, un peu en retrait.
    const tete = {
      x: r.x + r.etat.dx + Math.sin(a) * h * 0.8,
      y: this.sol + r.etat.dy - Math.cos(a) * h * 0.8 - 26,
    };
    const t = this.scene.time.now / 1000;
    for (let i = 0; i < 3; i++) {
      const ang = t * 6 + (i / 3) * Math.PI * 2;
      const x = tete.x + Math.cos(ang) * 38;
      const y = tete.y + Math.sin(ang) * 11;
      const pts: P[] = [];
      for (let k = 0; k < 10; k++) {
        const b = (k / 10) * Math.PI * 2 - Math.PI / 2 + t * 3;
        const rr = k % 2 === 0 ? 11 : 5;
        pts.push({ x: x + Math.cos(b) * rr, y: y + Math.sin(b) * rr });
      }
      forme(g, pts, { remplissage: COULEURS.jaune, trait: 2.5 });
    }
  }
}
