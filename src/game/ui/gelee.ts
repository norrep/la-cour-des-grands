/**
 * Image « en gelée » : la même texture découpée en tranches horizontales, que l'on décale chacune
 * un peu. Ça permet de plier, d'étirer et d'écraser un dessin plat sans le redessiner : c'est ce
 * qui fait respirer, se dandiner et sautiller les élèves, et ballotter le pantin.
 */
import Phaser from 'phaser';

export interface OptionsGelee {
  cle: string;
  echelle: number;
  /** Lignes de la texture affichées (en pixels de l'image) : tout par défaut. */
  de?: number;
  a?: number;
  /** Ligne de l'image placée en (0, 0) : le pivot (les pieds, le bas du buste, la prise…). */
  pivot: number;
  /** Colonne de l'image placée en x = 0 (le milieu du dessin ; l'image peut être plus large). */
  centreX?: number;
  tranches?: number;
}

/**
 * Le dessin posé sur une bande souple (une « corde » Phaser, verticale) : `plier` déplace ses
 * points, et la texture suit sans marches. Des tranches d'image décalées faisaient des escaliers
 * sur les traits verticaux (bras, jambes), visibles en grand.
 */
export class Gelee {
  readonly objets: Phaser.GameObjects.Rope[] = [];
  /** Ligne de l'image de chaque point de la corde, en pixels de l'image. */
  private readonly lignes: number[] = [];
  private readonly corde: Phaser.GameObjects.Rope;
  /** Décalage du centre de la bande par rapport à `centreX`, en pixels de l'image. */
  private readonly decalage: number;
  readonly largeur: number;
  readonly hauteur: number;

  constructor(
    scene: Phaser.Scene,
    private readonly o: OptionsGelee,
  ) {
    const texture = scene.textures.get(o.cle);
    // Le cadre « __BASE » : `get()` sans nom renverrait le premier cadre ajouté (un buste).
    const base = texture.get('__BASE');
    this.largeur = base?.width ?? 100;
    this.hauteur = base?.height ?? 100;
    const de = o.de ?? 0;
    const a = o.a ?? this.hauteur;
    let cadre = '__BASE';
    if (de > 0 || a < this.hauteur) {
      cadre = `lignes-${de}-${a}`;
      if (!texture.has(cadre)) texture.add(cadre, 0, 0, de, this.largeur, a - de);
    }
    const n = o.tranches ?? 28;
    for (let i = 0; i <= n; i++) this.lignes.push(de + ((a - de) * i) / n);
    this.decalage = this.largeur / 2 - (o.centreX ?? this.largeur / 2);
    this.corde = scene.add
      .rope(
        0,
        0,
        o.cle,
        cadre,
        this.lignes.map((l) => ({ x: 0, y: l })),
        false,
      )
      .setScale(o.echelle);
    this.objets.push(this.corde);
    this.plier(() => 0);
  }

  /**
   * Place la bande. `dx(d)` donne le décalage horizontal (en pixels de jeu) de la ligne
   * située à `d` pixels de jeu du pivot (positif vers le bas) ; `sy` étire en hauteur, `sx` en
   * largeur ; (`x`, `y`) déplace le tout.
   */
  plier(dx: (d: number) => number, sx = 1, sy = 1, x = 0, y = 0): void {
    const e = this.o.echelle;
    const points = this.corde.points as Phaser.Types.Math.Vector2Like[];
    this.lignes.forEach((ligne, i) => {
      const yImage = (ligne - this.o.pivot) * sy;
      const point = points[i];
      if (!point) return;
      point.x = this.decalage + dx(yImage * e) / (e * sx);
      point.y = yImage;
    });
    this.corde.setPosition(x, y).setScale(e * sx, e);
    this.corde.setDirty();
  }
}

/** Caractère d'un personnage au repos : chaque rôle a le sien. */
export type Caractere =
  | 'grand'
  | 'petit'
  | 'populaire'
  | 'chouchou'
  | 'rapporteuse'
  | 'contagieux'
  | 'delegue'
  | 'fouine'
  | 'surveillante';

/** Réglages du « vivant » d'un personnage posé. */
export interface OptionsVivant {
  /** Hauteur du personnage à l'écran : les amplitudes en dépendent. */
  hauteur: number;
  caractere?: Caractere;
  /** Buste sur une carte : même caractère, en plus doux et sans gestes qui sortent du cadre. */
  calme?: boolean;
}

/** Pose d'un instant : étirements, décalage du haut du corps, saut, regard (sx < 0). */
interface Pose {
  sx: number;
  sy: number;
  /** Décalage horizontal du haut de la tête (le bas ne bouge pas), en fraction de la hauteur. */
  pli: number;
  /** Hauteur de saut, en fraction de la hauteur (négatif : en l'air). */
  saut: number;
  regard: number;
}

type Geste = (p: number, pose: Pose) => boolean;

const cloche = (q: number) => Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);

/** Les gestes : `p` en secondes depuis le début ; renvoient false une fois finis. */
const GESTES: Record<string, Geste> = {
  saut(p, o) {
    if (p < 0.12) {
      o.sy -= 0.12 * (p / 0.12);
      o.sx += 0.08 * (p / 0.12);
    } else if (p < 0.5) {
      o.saut -= cloche((p - 0.12) / 0.38) * 0.13;
      o.sy += 0.07 * cloche((p - 0.12) / 0.38);
    } else if (p < 0.72) {
      o.sy -= 0.1 * cloche((p - 0.5) / 0.22);
      o.sx += 0.07 * cloche((p - 0.5) / 0.22);
    }
    return p < 0.72;
  },
  // « Moi ! Moi ! » : trois petits sauts sur la pointe des pieds.
  sautille(p, o) {
    const q = (p % 0.3) / 0.3;
    o.saut -= cloche(q) * 0.06;
    o.sy += cloche(q) * 0.04 - (q > 0.85 ? 0.04 : 0);
    return p < 0.9;
  },
  frisson(p, o) {
    o.pli += Math.sin(p * 40) * 0.04 * (1 - p / 0.6);
    return p < 0.6;
  },
  // Grand bâillement : on s'étire tout en haut, puis on retombe mou.
  baille(p, o) {
    if (p < 0.9) {
      o.sy += cloche(p / 1.8) * 0.12;
      o.sx -= cloche(p / 1.8) * 0.06;
    } else if (p < 1.5) {
      const q = (p - 0.9) / 0.6;
      o.sy += 0.12 * (1 - q) - cloche(q) * 0.06;
      o.pli += cloche(q) * 0.05;
    }
    return p < 1.5;
  },
  // A… a… atchoum ! On part en arrière, puis tout le corps est projeté en avant.
  eternue(p, o) {
    if (p < 0.7) {
      o.pli -= (p / 0.7) * 0.06;
      o.sy += (p / 0.7) * 0.06;
    } else if (p < 1.2) {
      const q = (p - 0.7) / 0.5;
      o.pli += 0.1 * (1 - q) * Math.cos(q * 9);
      o.sy -= 0.08 * (1 - q);
      o.sx += 0.06 * (1 - q);
    }
    return p < 1.2;
  },
  // Regarde à gauche, à droite : quelqu'un le suit ?
  regard(p, o) {
    if (p < 0.5 || (p > 1 && p < 1.4)) o.regard = -1;
    o.sy -= 0.03;
    return p < 1.6;
  },
  // Hochement de tête sérieux, deux fois.
  hoche(p, o) {
    o.sy -= cloche((p % 0.35) / 0.35) * 0.035;
    o.pli += cloche((p % 0.35) / 0.35) * 0.015;
    return p < 0.7;
  },
  // Bombe le torse, fier de son mot d'excuse.
  bombe(p, o) {
    o.sx += cloche(p / 1.2) * 0.1;
    o.sy += cloche(p / 1.2) * 0.04;
    return p < 1.2;
  },
  // Pirouette de star.
  tourne(p, o) {
    o.sx *= Math.cos((p / 0.6) * Math.PI * 2);
    o.saut -= cloche(p / 0.6) * 0.05;
    return p < 0.6;
  },
  // Se penche pour cafarder, deux fois, en sautillant.
  cafarde(p, o) {
    o.pli += cloche((p % 0.45) / 0.45) * 0.09;
    o.saut -= cloche((p % 0.45) / 0.45) * 0.03;
    return p < 0.9;
  },
  // Tape du pied, agacée.
  tape(p, o) {
    o.sy -= cloche((p % 0.25) / 0.25) * 0.025;
    return p < 1;
  },
};

interface Profil {
  /** Respiration : amplitude et vitesse (radians par seconde). */
  souffle: [number, number];
  /** Dandinement du haut du corps : amplitude (fraction de la hauteur) et vitesse. */
  balance: [number, number];
  /** Posture : un peu tassé (< 1) ou étiré (> 1). */
  tenue?: number;
  /** Mouvement continu propre au caractère. */
  fond?: (t: number, o: Pose) => void;
  gestes: string[];
  /** Pause entre deux gestes, en secondes : minimum et étendue. */
  pause: [number, number];
}

const PROFILS: Record<Caractere, Profil> = {
  // Grand : nonchalant, se balance lentement, bâille.
  grand: {
    souffle: [0.025, 1.6],
    balance: [0.05, 0.9],
    gestes: ['baille', 'baille', 'saut'],
    pause: [5, 8],
  },
  // Petit : ne tient pas en place, rebondit sans arrêt.
  petit: {
    souffle: [0.04, 4],
    balance: [0.04, 2.6],
    fond: (t, o) => {
      o.saut -= Math.abs(Math.sin(t * 5)) * 0.025;
    },
    gestes: ['saut', 'frisson', 'saut'],
    pause: [1.5, 3],
  },
  // Populaire : danse en rythme, et fait parfois une pirouette.
  populaire: {
    souffle: [0.02, 2.4],
    balance: [0, 1],
    fond: (t, o) => {
      o.pli += Math.sin(t * Math.PI * 2) * 0.05;
      o.sy -= Math.abs(Math.sin(t * Math.PI * 2)) * 0.03;
    },
    gestes: ['tourne'],
    pause: [3, 5],
  },
  // Chouchou : droit comme un i, lève la main en sautillant (« moi ! moi ! »).
  chouchou: {
    souffle: [0.02, 2.4],
    balance: [0.012, 1.4],
    tenue: 1.02,
    gestes: ['sautille', 'hoche'],
    pause: [3, 5],
  },
  // Rapporteuse : nerveuse, se penche pour tout raconter.
  rapporteuse: {
    souffle: [0.03, 3.4],
    balance: [0.03, 2.2],
    gestes: ['cafarde', 'tape', 'frisson'],
    pause: [2, 4],
  },
  // Contagieux : mou et voûté, renifle, éternue.
  contagieux: {
    souffle: [0.035, 1.8],
    balance: [0.035, 0.8],
    tenue: 0.97,
    gestes: ['eternue', 'frisson'],
    pause: [3, 6],
  },
  // Délégué : presque immobile, sérieux, bombe le torse.
  delegue: { souffle: [0.02, 2], balance: [0.008, 1], gestes: ['hoche', 'bombe'], pause: [4, 7] },
  // Fouine : tassée, se faufile d'un côté à l'autre, regarde derrière elle.
  fouine: {
    souffle: [0.025, 2.6],
    balance: [0.06, 1.8],
    tenue: 0.95,
    gestes: ['regard', 'regard', 'frisson'],
    pause: [2, 4],
  },
  // Mme Josiane : tape du pied, hoche la tête, rien ne lui échappe.
  surveillante: {
    souffle: [0.02, 1.8],
    balance: [0.015, 0.7],
    gestes: ['tape', 'hoche', 'regard'],
    pause: [3, 6],
  },
};

/**
 * Anime une gelée debout (pivot en bas) selon son caractère : respiration, dandinement qui plie le
 * haut du corps plus que les pieds, et de temps en temps un geste à lui. Chacun a sa propre phase :
 * ils ne bougent pas tous ensemble. L'animation s'arrête quand `porteur` est détruit.
 */
export function rendreVivant(
  scene: Phaser.Scene,
  gelee: Gelee,
  porteur: Phaser.GameObjects.GameObject,
  o: OptionsVivant,
): void {
  const h = o.hauteur;
  const profil = PROFILS[o.caractere ?? 'grand'];
  const doux = o.calme ? 0.6 : 1;
  const phase = Math.random() * 10;
  const pause = () => (profil.pause[0] + Math.random() * profil.pause[1]) * 1000;
  let prochain = scene.time.now + 800 + Math.random() * pause();
  let geste: { faire: Geste; debut: number } | null = null;
  const maj = (temps: number): void => {
    const t = temps / 1000 + phase;
    const souffle = Math.sin(t * profil.souffle[1]) * profil.souffle[0] * doux;
    const pose: Pose = {
      sx: 1 - souffle * 0.6,
      sy: (profil.tenue ?? 1) + souffle,
      pli:
        (Math.sin(t * profil.balance[1]) + 0.5 * Math.sin(t * profil.balance[1] * 0.37)) *
        profil.balance[0] *
        doux,
      saut: 0,
      regard: 1,
    };
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
    // Sur une carte, pas de saut ni de pirouette : on reste dans le cadre.
    if (o.calme) {
      pose.saut *= 0.3;
      pose.sx = Math.abs(pose.sx);
    }
    const sx = pose.sx * pose.regard;
    gelee.plier(
      (d) => pose.pli * h * Math.pow(Math.max(0, -d) / h, 1.6),
      sx,
      pose.sy,
      0,
      pose.saut * h,
    );
  };
  const ecouteur = (temps: number): void => maj(temps);
  scene.events.on(Phaser.Scenes.Events.UPDATE, ecouteur);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () =>
    scene.events.off(Phaser.Scenes.Events.UPDATE, ecouteur),
  );
  maj(scene.time.now);
}
