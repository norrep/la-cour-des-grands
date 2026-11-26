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
  tranches?: number;
}

/** Les tranches d'une image : `plier` place chacune selon sa ligne d'origine. */
export class Gelee {
  readonly objets: Phaser.GameObjects.Image[] = [];
  /** Milieu de chaque tranche, en pixels de l'image. */
  private readonly milieux: number[] = [];
  readonly largeur: number;
  readonly hauteur: number;

  constructor(
    scene: Phaser.Scene,
    private readonly o: OptionsGelee,
  ) {
    const frame = scene.textures.getFrame(o.cle);
    this.largeur = frame?.width ?? 100;
    this.hauteur = frame?.height ?? 100;
    const de = o.de ?? 0;
    const a = o.a ?? this.hauteur;
    const n = o.tranches ?? 14;
    const pas = (a - de) / n;
    for (let i = 0; i < n; i++) {
      const y0 = Math.floor(de + i * pas);
      // Une ligne de recouvrement : pas de fente entre deux tranches décalées.
      const y1 = Math.min(a, Math.ceil(de + (i + 1) * pas) + 1);
      const img = scene.add
        .image(0, 0, o.cle)
        .setOrigin(0.5, o.pivot / this.hauteur)
        .setScale(o.echelle)
        .setCrop(0, y0, this.largeur, y1 - y0);
      this.objets.push(img);
      this.milieux.push((y0 + y1) / 2);
    }
  }

  /**
   * Place les tranches. `dx(d)` donne le décalage horizontal (en pixels de jeu) d'une tranche
   * située à `d` pixels de jeu du pivot (positif vers le bas) ; `sy` étire en hauteur, `sx` en
   * largeur ; (`x`, `y`) déplace le tout.
   */
  plier(dx: (d: number) => number, sx = 1, sy = 1, x = 0, y = 0): void {
    const e = this.o.echelle;
    this.objets.forEach((img, i) => {
      const d = ((this.milieux[i] as number) - this.o.pivot) * e * sy;
      img.setPosition(x + dx(d), y).setScale(e * sx, e * sy);
    });
  }
}

/** Réglages du « vivant » d'un personnage posé. */
export interface OptionsVivant {
  /** Hauteur du personnage à l'écran : les amplitudes en dépendent. */
  hauteur: number;
  /** Respiration seulement (buste sur une carte) : pas de sauts. */
  calme?: boolean;
}

/**
 * Anime une gelée debout (pivot en bas) : respiration, balancement qui plie le haut du corps, et de
 * temps en temps un petit saut ou un frisson. Chaque personnage a sa propre phase, tirée de sa
 * position : ils ne bougent pas tous ensemble. L'animation s'arrête quand `porteur` est détruit.
 */
export function rendreVivant(
  scene: Phaser.Scene,
  gelee: Gelee,
  porteur: Phaser.GameObjects.GameObject,
  o: OptionsVivant,
): void {
  const h = o.hauteur;
  let phase = Math.random() * 10;
  let prochain = scene.time.now + 2500 + Math.random() * 7000;
  let geste: { type: 'saut' | 'frisson'; debut: number } | null = null;
  const maj = (temps: number): void => {
    const t = temps / 1000 + phase;
    // Respiration : on s'étire un peu en hauteur et on s'amincit d'autant.
    const souffle = Math.sin(t * 2.6) * (o.calme ? 0.022 : 0.03);
    let sy = 1 + souffle;
    let sx = 1 - souffle * 0.6;
    // Dandinement : le haut du corps se plie, plus fort vers la tête.
    let balance = Math.sin(t * 1.7) * h * 0.035 + Math.sin(t * 0.63) * h * 0.02;
    let saut = 0;
    if (!o.calme && geste === null && temps > prochain) {
      geste = { type: Math.random() < 0.55 ? 'saut' : 'frisson', debut: temps };
    }
    if (geste) {
      const p = (temps - geste.debut) / 1000;
      if (geste.type === 'saut') {
        // Accroupi, détente, en l'air, réception écrasée.
        if (p < 0.12) {
          sy -= 0.12 * (p / 0.12);
          sx += 0.08 * (p / 0.12);
        } else if (p < 0.5) {
          const q = (p - 0.12) / 0.38;
          saut = -Math.sin(q * Math.PI) * h * 0.13;
          sy += 0.07 * Math.sin(q * Math.PI);
        } else if (p < 0.72) {
          const q = (p - 0.5) / 0.22;
          sy -= 0.1 * Math.sin(q * Math.PI);
          sx += 0.07 * Math.sin(q * Math.PI);
        } else geste = null;
      } else {
        if (p < 0.6) balance += Math.sin(p * 40) * h * 0.04 * (1 - p / 0.6);
        else geste = null;
      }
      if (geste === null) {
        prochain = temps + 4000 + Math.random() * 9000;
        phase += 0.5;
      }
    }
    gelee.plier((d) => balance * Math.pow(Math.max(0, -d) / h, 1.6), sx, sy, 0, saut);
  };
  const ecouteur = (temps: number): void => maj(temps);
  scene.events.on(Phaser.Scenes.Events.UPDATE, ecouteur);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () =>
    scene.events.off(Phaser.Scenes.Events.UPDATE, ecouteur),
  );
  maj(scene.time.now);
}
