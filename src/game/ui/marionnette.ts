/**
 * Marionnette articulée : l'élève est découpé en six pièces rigides (tête, tronc, deux bras, deux
 * jambes) dessinées en T-pose, qui tournent autour de leurs attaches (cou, épaules, hanches).
 * Rien n'est étiré ni écrasé : la vie vient des mouvements des membres et de la tête, propres au
 * caractère de chaque rôle (voir `PROFILS`).
 */
import Phaser from 'phaser';
import type { Caractere } from './gelee';

export type NomPiece = 'jambeG' | 'jambeD' | 'brasG' | 'brasD' | 'tronc' | 'tete';

export interface PieceRig {
  /** Rectangle de la pièce dans la texture de l'élève : x, y, largeur, hauteur. */
  cadre: [number, number, number, number];
  /** Attache de la pièce, dans la pièce (pixels de texture). */
  pivot: [number, number];
  /** Position de l'attache par rapport au milieu des pieds (pixels de texture). */
  pos: [number, number];
}

export interface Rig {
  /** Hauteur de l'élève, en pixels de texture. */
  hauteur: number;
  /** Épaisseur des bras, en pixels de texture. */
  bras: number;
  /** Bout de la main gauche (à l'écran), depuis l'épaule gauche, bras tendu (pixels de texture). */
  main: [number, number];
  pieces: Record<NomPiece, PieceRig>;
}

/** Ordre d'affichage : jambes et bras derrière le tronc, la tête devant. */
const ORDRE: NomPiece[] = ['jambeG', 'jambeD', 'brasG', 'brasD', 'tronc', 'tete'];

/** Bras au repos : presque le long du corps, un peu écartés. */
const ECART = 0.22;

/** Pose d'un instant, en radians (0 = repos) et en fractions de la hauteur. */
export interface PoseMarionnette {
  /** Bascule du haut du corps autour des hanches (positif : vers la droite de l'écran). */
  tronc: number;
  tete: number;
  /** Rotation des bras depuis le repos : positif lève le bras gauche (par l'extérieur), négatif lève le droit. */
  brasG: number;
  brasD: number;
  jambeG: number;
  jambeD: number;
  /** Petit rebond du corps (respiration, sautillement), vers le haut si négatif. */
  rebond: number;
  /** Saut de tout l'élève, vers le haut si négatif. */
  saut: number;
  /** -1 : regarde de l'autre côté (la tête se retourne). */
  regard: number;
}

export const poseRepos = (): PoseMarionnette => ({
  tronc: 0,
  tete: 0,
  brasG: 0,
  brasD: 0,
  jambeG: 0,
  jambeD: 0,
  rebond: 0,
  saut: 0,
  regard: 1,
});

const sansCle = (cle: string, nom: NomPiece) => `${cle}#${nom}`;

/** Crée (une fois) les cadres des pièces dans la texture de l'élève. */
function cadres(scene: Phaser.Scene, cle: string, rig: Rig): void {
  const texture = scene.textures.get(cle);
  for (const nom of ORDRE) {
    const [x, y, l, h] = rig.pieces[nom].cadre;
    if (!texture.has(sansCle(cle, nom))) texture.add(sansCle(cle, nom), 0, x, y, l, h);
  }
}

export class Marionnette {
  /** Origine au milieu des pieds. */
  readonly racine: Phaser.GameObjects.Container;
  /** Haut du corps et jambes, tournant autour des hanches. */
  readonly corps: Phaser.GameObjects.Container;
  readonly pieces: Record<NomPiece, Phaser.GameObjects.Image>;
  private readonly hanches: [number, number];
  /** Angle du bras au repos, pour chaque côté (radians). */
  readonly reposBras = { brasG: -(Math.PI / 2 - ECART), brasD: Math.PI / 2 - ECART };

  constructor(
    scene: Phaser.Scene,
    cle: string,
    readonly rig: Rig,
    readonly echelle: number,
  ) {
    cadres(scene, cle, rig);
    this.hanches = rig.pieces.tronc.pos;
    const [hx, hy] = this.hanches;
    const images = {} as Record<NomPiece, Phaser.GameObjects.Image>;
    for (const nom of ORDRE) {
      const p = rig.pieces[nom];
      images[nom] = scene.add
        .image(p.pos[0] - hx, p.pos[1] - hy, cle, sansCle(cle, nom))
        .setOrigin(p.pivot[0] / p.cadre[2], p.pivot[1] / p.cadre[3]);
    }
    this.pieces = images;
    this.corps = scene.add.container(
      hx,
      hy,
      ORDRE.map((n) => images[n]),
    );
    this.racine = scene.add.container(0, 0, [this.corps]).setScale(echelle);
    this.poser(poseRepos());
  }

  /** Hauteur de l'élève à l'écran. */
  get hauteur(): number {
    return this.rig.hauteur * this.echelle;
  }

  /** Point de l'élève (pixels de texture depuis les pieds) à l'écran, dans le repère de `racine`. */
  poser(p: PoseMarionnette): void {
    const h = this.rig.hauteur;
    const [hx, hy] = this.hanches;
    this.corps.setPosition(hx, hy + p.saut * h).setRotation(p.tronc);
    this.pieces.tronc.setY(p.rebond * h * 0.5);
    const [tx, ty] = this.rig.pieces.tete.pos;
    this.pieces.tete
      .setPosition(tx - hx, ty - hy + p.rebond * h)
      .setRotation(p.tete)
      .setScale(p.regard, 1);
    for (const nom of ['brasG', 'brasD'] as const) {
      const [bx, by] = this.rig.pieces[nom].pos;
      this.pieces[nom]
        .setPosition(bx - hx, by - hy + p.rebond * h * 0.8)
        .setRotation(this.reposBras[nom] + p[nom]);
    }
    // Les jambes restent au sol quand le haut du corps penche : elles compensent la bascule.
    this.pieces.jambeG.setRotation(p.jambeG - p.tronc * (p.saut < 0 ? 0 : 1));
    this.pieces.jambeD.setRotation(p.jambeD - p.tronc * (p.saut < 0 ? 0 : 1));
  }

  /** Oriente une pièce (dans le repère du corps) pour que son bout vise une direction du monde. */
  angleBrasVers(nom: 'brasG' | 'brasD', angleMonde: number): number {
    const [mx, my] = nom === 'brasG' ? this.rig.main : [-this.rig.main[0], this.rig.main[1]];
    return angleMonde - Math.atan2(my, mx) - this.corps.rotation;
  }

  /** Longueur du bras, de l'épaule au bout de la main, à l'écran. */
  get longueurBras(): number {
    return Math.hypot(this.rig.main[0], this.rig.main[1]) * this.echelle;
  }

  /** Position de l'épaule gauche par rapport aux hanches, à l'écran, corps droit. */
  get epauleG(): [number, number] {
    const [bx, by] = this.rig.pieces.brasG.pos;
    const [hx, hy] = this.hanches;
    return [(bx - hx) * this.echelle, (by - hy) * this.echelle];
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Vie au repos : chaque caractère bouge à sa façon, sans jamais déformer le dessin.            */
/* ------------------------------------------------------------------------------------------ */

type Geste = (p: number, o: PoseMarionnette) => boolean;

const cloche = (q: number) => Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);

/** Les gestes : `p` en secondes depuis le début ; renvoient false une fois finis. */
const GESTES: Record<string, Geste> = {
  // Saut de joie, bras en l'air.
  saut(p, o) {
    const q = cloche(p / 0.55);
    o.saut -= q * 0.12;
    o.brasG += q * 1.6;
    o.brasD -= q * 1.6;
    o.jambeG += q * 0.25;
    o.jambeD -= q * 0.25;
    return p < 0.55;
  },
  // « Moi ! Moi ! » : la main droite levée bien haut, en sautillant.
  sautille(p, o) {
    const leve = cloche(p / 1.3);
    o.brasD -= leve * 2.6 + Math.sin(p * 18) * 0.15 * leve;
    o.saut -= Math.abs(Math.sin(p * 10)) * 0.03 * leve;
    o.tronc -= leve * 0.05;
    return p < 1.3;
  },
  frisson(p, o) {
    const f = Math.sin(p * 45) * (1 - p / 0.6);
    o.tronc += f * 0.04;
    o.tete += f * 0.12;
    o.brasG += f * 0.15;
    o.brasD -= f * 0.15;
    return p < 0.6;
  },
  // Grand bâillement : bras étirés au-dessus de la tête, tête en arrière.
  baille(p, o) {
    const q = cloche(p / 1.8);
    o.brasG += q * 2.4;
    o.brasD -= q * 2.4;
    o.tete -= q * 0.25;
    o.rebond -= q * 0.01;
    return p < 1.8;
  },
  // A… a… atchoum ! La tête part en arrière, puis tout le haut du corps est projeté en avant.
  eternue(p, o) {
    if (p < 0.7) {
      o.tete -= (p / 0.7) * 0.3;
      o.tronc -= (p / 0.7) * 0.06;
    } else if (p < 1.3) {
      const q = (p - 0.7) / 0.6;
      const coup = (1 - q) * Math.cos(q * 8);
      o.tete += coup * 0.35;
      o.tronc += coup * 0.12;
      o.brasG += coup * 0.4;
      o.brasD -= coup * 0.4;
    }
    return p < 1.3;
  },
  // Regarde derrière lui : quelqu'un le suit ?
  regard(p, o) {
    if (p < 0.5 || (p > 1 && p < 1.4)) o.regard = -1;
    o.tete += Math.sin(p * 3) * 0.08;
    return p < 1.6;
  },
  // Hochement de tête sérieux, deux fois.
  hoche(p, o) {
    o.tete += cloche((p % 0.35) / 0.35) * 0.18;
    return p < 0.7;
  },
  // Poings sur les hanches, torse bombé, menton levé.
  bombe(p, o) {
    const q = cloche(p / 1.4);
    o.brasG += q * 0.5;
    o.brasD -= q * 0.5;
    o.tete -= q * 0.15;
    o.rebond -= q * 0.008;
    return p < 1.4;
  },
  // Petite danse de star : les bras s'agitent en l'air à tour de rôle.
  danse(p, o) {
    const q = cloche(p / 1.6);
    o.brasG += q * (1.6 + Math.sin(p * 9) * 0.5);
    o.brasD -= q * (1.6 - Math.sin(p * 9) * 0.5);
    o.tronc += Math.sin(p * 9) * 0.08 * q;
    o.tete -= Math.sin(p * 9) * 0.12 * q;
    return p < 1.6;
  },
  // Se penche et agite la main : « Madame ! Madame ! »
  cafarde(p, o) {
    const q = cloche(p / 1.2);
    o.tronc += q * 0.14;
    o.tete += q * 0.15;
    o.brasD -= q * (2 + Math.sin(p * 16) * 0.2);
    return p < 1.2;
  },
  // Tape du pied, agacée.
  tape(p, o) {
    o.jambeD -= cloche((p % 0.25) / 0.25) * 0.25;
    o.brasG += 0.4 * cloche(p / 1);
    o.brasD -= 0.4 * cloche(p / 1);
    return p < 1;
  },
};

interface Profil {
  /** Respiration : amplitude (fraction de la hauteur) et vitesse (radians par seconde). */
  souffle: [number, number];
  /** Balancement du haut du corps : amplitude (radians) et vitesse. */
  balance: [number, number];
  /** Bras qui pendent et ballottent : amplitude (radians) et vitesse. */
  bras: [number, number];
  /** Tête penchée en permanence (radians). */
  tete?: number;
  /** Mouvement continu propre au caractère. */
  fond?: (t: number, o: PoseMarionnette) => void;
  gestes: string[];
  /** Pause entre deux gestes, en secondes : minimum et étendue. */
  pause: [number, number];
}

const PROFILS: Record<Caractere, Profil> = {
  // Grand : nonchalant, se balance lentement, bâille, la tête un peu penchée.
  grand: {
    souffle: [0.006, 1.6],
    balance: [0.04, 0.9],
    bras: [0.12, 0.9],
    tete: 0.08,
    gestes: ['baille', 'baille', 'saut'],
    pause: [5, 8],
  },
  // Petit : ne tient pas en place, rebondit sans arrêt et agite les bras.
  petit: {
    souffle: [0.01, 4],
    balance: [0.05, 2.6],
    bras: [0.25, 5],
    fond: (t, o) => {
      o.saut -= Math.abs(Math.sin(t * 5)) * 0.03;
    },
    gestes: ['saut', 'frisson', 'saut'],
    pause: [1.5, 3],
  },
  // Populaire : danse en rythme, et lève les bras comme une star.
  populaire: {
    souffle: [0.006, 2.4],
    balance: [0, 1],
    bras: [0.15, 2],
    fond: (t, o) => {
      const b = Math.sin(t * Math.PI * 2);
      o.tronc += b * 0.06;
      o.tete -= b * 0.1;
      o.rebond -= Math.abs(b) * 0.01;
    },
    gestes: ['danse'],
    pause: [3, 5],
  },
  // Chouchou : droit comme un i, lève la main (« moi ! moi ! ») ou approuve.
  chouchou: {
    souffle: [0.005, 2.4],
    balance: [0.01, 1.4],
    bras: [0.04, 1.4],
    gestes: ['sautille', 'hoche'],
    pause: [3, 5],
  },
  // Rapporteuse : nerveuse, se penche pour tout raconter, tape du pied.
  rapporteuse: {
    souffle: [0.008, 3.4],
    balance: [0.03, 2.2],
    bras: [0.1, 3],
    gestes: ['cafarde', 'tape', 'frisson'],
    pause: [2, 4],
  },
  // Contagieux : mou et voûté, bras ballants, renifle, éternue.
  contagieux: {
    souffle: [0.01, 1.8],
    balance: [0.04, 0.8],
    bras: [0.15, 0.8],
    tete: 0.12,
    gestes: ['eternue', 'frisson'],
    pause: [3, 6],
  },
  // Délégué : presque immobile, sérieux, poings sur les hanches.
  delegue: {
    souffle: [0.005, 2],
    balance: [0.006, 1],
    bras: [0.02, 1],
    gestes: ['hoche', 'bombe'],
    pause: [4, 7],
  },
  // Fouine : se faufile d'un côté à l'autre, regarde derrière elle.
  fouine: {
    souffle: [0.006, 2.6],
    balance: [0.07, 1.8],
    bras: [0.1, 1.8],
    tete: -0.1,
    gestes: ['regard', 'regard', 'frisson'],
    pause: [2, 4],
  },
  surveillante: {
    souffle: [0.005, 1.8],
    balance: [0.015, 0.7],
    bras: [0.05, 0.7],
    gestes: ['tape', 'hoche', 'regard'],
    pause: [3, 6],
  },
};

export interface OptionsVie {
  caractere: Caractere;
  /** En buste (carte, pastille) : mêmes mouvements, plus doux, sans saut ni jambes. */
  calme?: boolean;
  /** Appelé à chaque image, après la pose (par exemple pour suivre un masque). */
  apres?: () => void;
}

/**
 * Anime la marionnette selon son caractère : respiration, balancement, bras qui ballottent, et
 * de temps en temps un geste. Chacun a sa phase : ils ne bougent pas tous ensemble.
 * L'animation s'arrête quand `porteur` est détruit.
 */
export function animerMarionnette(
  scene: Phaser.Scene,
  m: Marionnette,
  porteur: Phaser.GameObjects.GameObject,
  o: OptionsVie,
): void {
  const profil = PROFILS[o.caractere];
  const doux = o.calme ? 0.6 : 1;
  const phase = Math.random() * 10;
  const pause = () => (profil.pause[0] + Math.random() * profil.pause[1]) * 1000;
  let prochain = scene.time.now + 800 + Math.random() * pause();
  let geste: { faire: Geste; debut: number } | null = null;
  const sansAnimations = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
  const maj = (temps: number): void => {
    if (!m.racine.active) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, ecouteur);
      return;
    }
    const t = temps / 1000 + phase;
    const pose = poseRepos();
    if (!sansAnimations) {
      pose.rebond = Math.sin(t * profil.souffle[1]) * profil.souffle[0] * doux;
      pose.tronc =
        (Math.sin(t * profil.balance[1]) + 0.5 * Math.sin(t * profil.balance[1] * 0.37)) *
        profil.balance[0] *
        doux;
      const ballant = Math.sin(t * profil.bras[1] + 1) * profil.bras[0] * doux;
      pose.brasG = ballant - pose.tronc;
      pose.brasD = ballant * 0.8 - pose.tronc;
      pose.tete = (profil.tete ?? 0) + Math.sin(t * profil.balance[1] * 0.7 + 2) * 0.04 * doux;
      profil.fond?.(t, pose);
      if (geste === null && temps > prochain) {
        const choix = profil.gestes[Math.floor(Math.random() * profil.gestes.length)] ?? 'saut';
        const faire = GESTES[choix];
        if (faire) geste = { faire, debut: temps };
      }
      if (geste && !geste.faire((temps - geste.debut) / 1000, pose)) {
        geste = null;
        prochain = temps + pause();
      }
    }
    // En buste, on reste dans le cadre : pas de saut, peu de bascule.
    if (o.calme) {
      pose.saut *= 0.25;
      pose.tronc *= 0.5;
    }
    m.poser(pose);
    o.apres?.();
  };
  const ecouteur = (temps: number): void => maj(temps);
  maj(scene.time.now);
  scene.events.on(Phaser.Scenes.Events.UPDATE, ecouteur);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () =>
    scene.events.off(Phaser.Scenes.Events.UPDATE, ecouteur),
  );
}
