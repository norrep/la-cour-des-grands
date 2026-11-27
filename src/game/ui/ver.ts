/**
 * Ver de terre d'un seul morceau (DB.7) : pas de membres, donc pas de découpe. Le dessin entier
 * (`vers-<rôle>-corps.png`, trait égalisé comme les autres élèves) est plaqué sur une colonne souple
 * de points : le corps se plie, ondule, s'étire et s'écrase sans jointure. La queue enroulée reste
 * posée au sol ; la souplesse grandit vers la tête.
 *
 * En rendu Canvas (réglage « rendu »), Phaser ne sait pas déformer une image : le ver est alors une
 * image simple qui penche et s'étire.
 */
import Phaser from 'phaser';
import type { Caractere, PoseMarionnette } from './marionnette';

/** Nombre de points de la colonne, de la tête à la queue. */
const POINTS = 32;
/** Part du bas du corps (la queue au sol) qui ne plie pas. */
const SOCLE = 0.12;

/** Forme du ver à un instant. Angles en radians, longueurs en fractions de la hauteur. */
export interface FormeVer {
  /** Courbure du corps entier, de la queue à la tête (positif : la tête part vers la droite). */
  penche: number;
  /** Courbure en plus, seulement dans le haut (le cou). */
  tete: number;
  /** Ondulation qui remonte le long du corps : amplitude et phase. */
  onde: number;
  phase: number;
  /** Nombre de vagues sur la longueur du corps. */
  vagues: number;
  /** Étirement en hauteur (1 : repos) ; le corps s'amincit d'autant pour garder son volume. */
  etire: number;
  /** Saut de tout le ver, vers le haut si négatif. */
  saut: number;
  /** Bosse qui gonfle le corps (fraction de la largeur), à une hauteur `bosse` (0 queue, 1 tête). */
  gonfle: number;
  bosse: number;
}

export const formeRepos = (): FormeVer => ({
  penche: 0,
  tete: 0,
  onde: 0,
  phase: 0,
  vagues: 1,
  etire: 1,
  saut: 0,
  gonfle: 0,
  bosse: 0.5,
});

/** Douce montée de 0 à 1 entre `a` et `b`. */
const lisse = (x: number, a: number, b: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Corde de Phaser dont chaque point a sa propre demi-largeur. */
class Corde extends Phaser.GameObjects.Rope {
  /** Demi-largeur à chaque point (pixels de texture). Absente pendant la construction de la corde. */
  largeurs?: number[];

  override updateVertices(): this {
    const pts = this.points;
    const v = this.vertices;
    const n = pts.length;
    this.dirty = false;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)] as Phaser.Types.Math.Vector2Like;
      const b = pts[Math.min(n - 1, i + 1)] as Phaser.Types.Math.Vector2Like;
      const p = pts[i] as Phaser.Types.Math.Vector2Like;
      let px = (b.y ?? 0) - (a.y ?? 0);
      let py = -((b.x ?? 0) - (a.x ?? 0));
      const l = Math.hypot(px, py) || 1;
      const w = this.largeurs?.[i] ?? this.frame.halfWidth;
      px = (px / l) * w;
      py = (py / l) * w;
      v[i * 4] = (p.x ?? 0) + px;
      v[i * 4 + 1] = (p.y ?? 0) + py;
      v[i * 4 + 2] = (p.x ?? 0) - px;
      v[i * 4 + 3] = (p.y ?? 0) - py;
    }
    return this;
  }
}

export class Ver {
  /** Origine au milieu des pieds (le bas de la queue). */
  readonly racine: Phaser.GameObjects.Container;
  /** Le corps : une corde déformée, ou une image en Canvas. */
  readonly corps: Corde | Phaser.GameObjects.Image;
  private readonly h: number;
  private readonly demi: number;

  constructor(
    scene: Phaser.Scene,
    readonly cle: string,
    readonly echelle: number,
  ) {
    const frame = scene.textures.getFrame(cle);
    this.h = frame.height;
    this.demi = frame.width / 2;
    if (scene.renderer.type === Phaser.WEBGL) {
      const corde = new Corde(scene, 0, 0, cle, undefined, POINTS);
      corde.largeurs = [];
      corde.setVertical(POINTS);
      this.corps = corde;
    } else {
      this.corps = scene.add.image(0, 0, cle).setOrigin(0.5, 1);
    }
    this.racine = scene.add.container(0, 0, [this.corps]).setScale(echelle);
    this.former(formeRepos());
  }

  /** Hauteur du ver à l'écran. */
  get hauteur(): number {
    return this.h * this.echelle;
  }

  /** Dessine le ver dans la forme `f`, debout sur sa queue. */
  former(f: FormeVer): void {
    const h = this.h;
    const corps = this.corps;
    if (!(corps instanceof Corde)) {
      corps
        .setPosition(0, f.saut * h)
        .setRotation((f.penche + f.tete) * 0.5)
        .setScale(1 / Math.sqrt(f.etire), f.etire);
      return;
    }
    // On remonte la colonne depuis la queue, à pas égaux le long du corps : plier ne l'allonge pas.
    const n = POINTS;
    const pas = (h * f.etire) / (n - 1);
    const epais = this.demi / Math.sqrt(f.etire);
    let x = 0;
    let y = f.saut * h;
    for (let k = 0; k < n; k++) {
      const s = k / (n - 1);
      const i = n - 1 - k;
      const p = corde(corps, i);
      p.x = x;
      p.y = y;
      const souple = lisse(s, SOCLE, 1);
      const angle =
        f.penche * souple +
        f.tete * lisse(s, 0.6, 1) +
        f.onde * souple * Math.sin(Math.PI * 2 * f.vagues * s - f.phase);
      x += Math.sin(angle) * pas;
      y -= Math.cos(angle) * pas;
      const bosse = f.gonfle * Math.exp(-(((s - f.bosse) / 0.09) ** 2));
      (corps.largeurs ??= [])[i] = epais * (1 + bosse);
    }
    corps.setDirty();
  }

  /**
   * Pendu par le haut de la tête (on attrape le ver par la tête) : `main` en pixels de jeu dans le
   * repère du parent de `racine`, `angle` la direction du corps depuis la verticale (positif : la
   * queue part vers la droite), `courbe` le retard de la queue.
   */
  pendre(main: { x: number; y: number }, angle: number, courbe: number, temps: number): void {
    const corps = this.corps;
    const h = this.h;
    this.racine.setPosition(0, 0);
    if (!(corps instanceof Corde)) {
      corps.setOrigin(0.5, 0).setPosition(main.x / this.echelle, main.y / this.echelle);
      corps.setRotation(-angle).setScale(1, 1);
      return;
    }
    // Pendu, le ver s'allonge sous son poids.
    const n = POINTS;
    const etire = 1.08;
    const pas = (h * etire) / (n - 1);
    let x = main.x / this.echelle;
    let y = main.y / this.echelle;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const p = corde(corps, i);
      p.x = x;
      p.y = y;
      const a = angle + courbe * u * u + Math.sin(temps * 6 - u * 5) * 0.12 * u;
      x += Math.sin(a) * pas;
      y += Math.cos(a) * pas;
      (corps.largeurs ??= [])[i] = this.demi / Math.sqrt(etire);
    }
    corps.setDirty();
  }

  /** Forme tirée d'une pose de marionnette, pour les mises en scène écrites pour les élèves. */
  poser(p: PoseMarionnette): void {
    const f = formeRepos();
    f.penche = p.tronc * 2;
    f.tete = p.tete * 1.5 + (p.regard < 0 ? -0.4 : 0);
    // Bras levés : le ver s'étire vers le ciel.
    f.etire = 1 - p.rebond * 6 + Math.max(0, p.brasG - p.brasD) * 0.04;
    f.saut = p.saut;
    this.former(f);
  }
}

const corde = (c: Corde, i: number): { x: number; y: number } =>
  c.points[i] as unknown as { x: number; y: number };

/* ------------------------------------------------------------------------------------------ */
/* Vie au repos : un ver ne bouge pas comme un élève. Il ondule, se tortille, s'étire.         */
/* ------------------------------------------------------------------------------------------ */

type Geste = (p: number, f: FormeVer) => boolean;

/** Ampleur du balancement et de l'ondulation au repos : un ver, c'est mou, ça se voit. */
const MOU = 1.8;

const cloche = (q: number) => Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);
/** Rebond amorti après un choc : 1 au choc, oscille et s'éteint. */
const ressort = (q: number, vitesse = 18, amorti = 5) =>
  q < 0 ? 0 : Math.exp(-q * amorti) * Math.cos(q * vitesse);

const GESTES: Record<string, Geste> = {
  // Boing ! S'écrase, jaillit tout étiré, retombe aplati et tremblote.
  boing(p, f) {
    if (p < 0.15) f.etire -= cloche(p / 0.3) * 0.25;
    else if (p < 0.6) {
      const q = (p - 0.15) / 0.45;
      f.saut -= Math.sin(q * Math.PI) * 0.3;
      f.etire += 0.22 * Math.sin(q * Math.PI) ** 0.5 - 0.1 * q;
    } else f.etire -= ressort(p - 0.6) * 0.28;
    return p < 1.3;
  },
  // Se tortille de joie : vagues rapides de la queue à la tête.
  tortille(p, f) {
    const q = cloche(p / 1.2);
    f.onde += q * 0.5;
    f.vagues = 1.5;
    f.phase += p * 22;
    return p < 1.2;
  },
  // Frisson : tout le corps vibre.
  frisson(p, f) {
    const v = Math.sin(p * 50) * (1 - p / 0.6);
    f.onde += v * 0.08;
    f.vagues = 2;
    f.etire += v * 0.02;
    return p < 0.6;
  },
  // Grand bâillement : s'étire très haut, la tête en arrière, puis se tasse.
  baille(p, f) {
    const q = cloche(p / 1.8);
    f.etire += q * 0.22;
    f.tete -= q * 0.35;
    f.etire -= ressort(p - 1.8, 14, 4) * 0.12;
    return p < 2.5;
  },
  // A… a… atchoum ! Une bosse remonte le corps, la tête recule, puis tout part en avant.
  eternue(p, f) {
    if (p < 0.9) {
      const q = p / 0.9;
      f.gonfle += 0.35 * cloche(q * 1.1);
      f.bosse = 0.1 + q * 0.75;
      f.tete -= q * 0.45;
      f.etire += q * 0.1;
    } else {
      const coup = ressort(p - 0.9, 16, 4);
      f.tete += coup * 0.7;
      f.penche += coup * 0.25;
      f.etire -= Math.max(0, coup) * 0.25;
    }
    return p < 1.8;
  },
  // Jette un œil d'un côté puis de l'autre, le cou tendu.
  regard(p, f) {
    const cote = p < 0.8 ? 1 : -1;
    f.tete += cote * cloche((p % 0.8) / 0.8) * 0.55;
    f.etire += cloche(p / 1.6) * 0.06;
    return p < 1.6;
  },
  // Hochement sérieux : deux petites courbettes du cou.
  hoche(p, f) {
    f.tete += cloche((p % 0.4) / 0.4) * 0.3;
    f.etire -= cloche((p % 0.4) / 0.4) * 0.04;
    return p < 0.8;
  },
  // Bombe le torse : la chasuble gonfle, le ver se grandit.
  bombe(p, f) {
    const q = cloche(p / 1.5);
    f.gonfle += q * 0.22;
    f.bosse = 0.55;
    f.etire += q * 0.08;
    f.tete -= q * 0.15;
    return p < 1.5;
  },
  // Danse : grandes vagues en rythme et petits rebonds.
  danse(p, f) {
    const q = cloche(p / 2);
    f.onde += q * 0.45;
    f.vagues = 1;
    f.phase += p * 9;
    f.etire += Math.abs(Math.sin(p * 9)) * 0.08 * q;
    return p < 2;
  },
  // « Moi ! Moi ! » : se dresse le plus haut possible en se dandinant.
  moi(p, f) {
    const q = cloche(p / 1.4);
    f.etire += q * 0.35;
    f.tete += Math.sin(p * 16) * 0.2 * q;
    f.penche += Math.sin(p * 8) * 0.06 * q;
    return p < 1.4;
  },
  // Se penche pour cafarder à l'oreille de la surveillante, en se tortillant.
  cafarde(p, f) {
    const q = cloche(p / 1.4);
    f.penche += q * 0.45;
    f.tete += q * 0.35;
    f.onde += q * Math.sin(p * 20) * 0.05;
    return p < 1.4;
  },
  // Se faufile : glisse en S d'un côté à l'autre.
  faufile(p, f) {
    const q = cloche(p / 2);
    f.onde += q * 0.28;
    f.vagues = 1.2;
    f.phase += p * 5;
    f.penche += Math.sin(p * 3) * 0.2 * q;
    return p < 2;
  },
};

interface Profil {
  /** Respiration : amplitude (étirement) et vitesse. */
  souffle: [number, number];
  /** Balancement du corps : amplitude (radians) et vitesse. */
  balance: [number, number];
  /** Ondulation permanente, qui remonte le corps : amplitude et vitesse. */
  onde: [number, number];
  /** Cou penché en permanence. */
  tete?: number;
  fond?: (t: number, f: FormeVer) => void;
  gestes: string[];
  pause: [number, number];
}

const PROFILS: Record<Caractere, Profil> = {
  // Grand : mou et nonchalant, se balance lentement, bâille.
  grand: {
    souffle: [0.02, 1.4],
    balance: [0.1, 0.8],
    onde: [0.05, 1.5],
    tete: 0.1,
    gestes: ['baille', 'tortille', 'baille'],
    pause: [4, 6],
  },
  // Petit : ne tient pas en place, rebondit comme un ressort.
  petit: {
    souffle: [0.03, 4],
    balance: [0.08, 2.4],
    onde: [0.08, 4],
    gestes: ['boing', 'boing', 'tortille', 'frisson'],
    pause: [1.2, 2],
  },
  // Populaire : danse en permanence.
  populaire: {
    souffle: [0.02, 2.4],
    balance: [0.06, 1],
    onde: [0.12, 6],
    fond: (t, f) => {
      f.etire += Math.abs(Math.sin(t * Math.PI)) * 0.04;
    },
    gestes: ['danse', 'boing'],
    pause: [2.5, 4],
  },
  // Chouchou : droit comme un i, se dresse pour être interrogé.
  chouchou: {
    souffle: [0.015, 2.4],
    balance: [0.03, 1.4],
    onde: [0.02, 2],
    gestes: ['moi', 'hoche'],
    pause: [3, 4],
  },
  // Rapporteuse : nerveuse, se penche pour tout raconter.
  rapporteuse: {
    souffle: [0.02, 3.4],
    balance: [0.07, 2],
    onde: [0.06, 5],
    gestes: ['cafarde', 'frisson', 'cafarde'],
    pause: [2, 3],
  },
  // Contagieux : avachi, renifle, éternue.
  contagieux: {
    souffle: [0.03, 1.6],
    balance: [0.08, 0.7],
    onde: [0.04, 1.2],
    tete: 0.2,
    gestes: ['eternue', 'frisson'],
    pause: [3, 5],
  },
  // Délégué : presque immobile, sérieux, bombe le torse.
  delegue: {
    souffle: [0.012, 2],
    balance: [0.02, 1],
    onde: [0.015, 1.5],
    gestes: ['hoche', 'bombe'],
    pause: [3.5, 5],
  },
  // Fouine : se faufile, regarde partout.
  fouine: {
    souffle: [0.015, 2.6],
    balance: [0.1, 1.6],
    onde: [0.1, 3],
    tete: -0.12,
    gestes: ['regard', 'faufile', 'regard'],
    pause: [1.8, 3],
  },
  surveillante: {
    souffle: [0.015, 1.8],
    balance: [0.03, 0.7],
    onde: [0.02, 1],
    gestes: ['regard', 'hoche'],
    pause: [2, 3],
  },
};

function phaseDe(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 1000;
}

/**
 * Anime le ver selon son caractère : il respire, se balance, ondule, et de temps en temps fait un
 * geste. S'arrête quand `porteur` est détruit. `calme` : en buste, mouvements plus doux, sans saut.
 */
export function animerVer(
  scene: Phaser.Scene,
  v: Ver,
  porteur: Phaser.GameObjects.GameObject,
  o: { caractere: Caractere; calme?: boolean },
): void {
  const profil = PROFILS[o.caractere];
  const doux = o.calme ? 0.6 : 1;
  const phase = phaseDe(`${v.cle}/${o.caractere}`);
  const pause = () => (profil.pause[0] + Math.random() * profil.pause[1]) * 1000;
  let prochain = scene.time.now + 600 + Math.random() * pause();
  let geste: { faire: Geste; debut: number } | null = null;
  const sansAnimations = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
  const maj = (temps: number): void => {
    if (!v.racine.active) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, maj);
      return;
    }
    const t = temps / 1000 + phase;
    const f = formeRepos();
    if (!sansAnimations) {
      f.etire = 1 + Math.sin(t * profil.souffle[1]) * profil.souffle[0];
      f.penche =
        (Math.sin(t * profil.balance[1]) + 0.4 * Math.sin(t * profil.balance[1] * 0.41)) *
        profil.balance[0] *
        MOU;
      f.onde = profil.onde[0] * MOU;
      f.phase = t * profil.onde[1];
      f.tete = (profil.tete ?? 0) - f.penche * 0.6;
      profil.fond?.(t, f);
      if (geste === null && temps > prochain) {
        const choix = profil.gestes[Math.floor(Math.random() * profil.gestes.length)] ?? 'tortille';
        const faire = GESTES[choix];
        if (faire) geste = { faire, debut: temps };
      }
      if (geste && !geste.faire((temps - geste.debut) / 1000, f)) {
        geste = null;
        prochain = temps + pause();
      }
      if (o.calme) {
        f.saut *= 0.2;
        f.penche *= doux;
        f.onde *= doux;
        f.etire = 1 + (f.etire - 1) * doux;
      }
    }
    v.former(f);
  };
  maj(scene.time.now);
  scene.events.on(Phaser.Scenes.Events.UPDATE, maj);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () =>
    scene.events.off(Phaser.Scenes.Events.UPDATE, maj),
  );
}
