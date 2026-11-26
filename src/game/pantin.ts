/**
 * Physique du « pantin » (faux ragdoll 2D) : chaque partie du corps est un pendule accroché
 * à un point qui suit le doigt. Calcul pur, sans Phaser, pour être testé.
 *
 * Repère de l'écran : x vers la droite, y vers le bas. L'angle d'un membre est mesuré depuis
 * la verticale descendante, positif quand le bout part vers la droite.
 */
export interface Membre {
  angle: number;
  vitesse: number;
}

export interface ReglagesMembre {
  /** Longueur du membre en pixels. */
  longueur: number;
  /** Freinage (par seconde) : plus il est fort, moins le membre ballotte. */
  amorti: number;
}

export const GRAVITE = 2400;
const ANGLE_MAX = 2.4;
const PAS_MAX = 1 / 30;

export const membreAuRepos = (): Membre => ({ angle: 0, vitesse: 0 });

/**
 * Avance un membre de `dt` secondes, quand son point d'attache accélère de (ax, ay) px/s².
 * Dans le repère du point d'attache, tout se passe comme si la pesanteur valait (−ax, g − ay).
 */
export function avancerMembre(
  m: Membre,
  ax: number,
  ay: number,
  dt: number,
  r: ReglagesMembre,
): Membre {
  let { angle, vitesse } = m;
  let reste = Math.max(0, dt);
  while (reste > 0) {
    const h = Math.min(PAS_MAX / 2, reste);
    const fx = -ax;
    const fy = GRAVITE - ay;
    const acc = (fx * Math.cos(angle) - fy * Math.sin(angle)) / r.longueur - r.amorti * vitesse;
    vitesse += acc * h;
    angle += vitesse * h;
    if (angle > ANGLE_MAX) {
      angle = ANGLE_MAX;
      vitesse = Math.min(0, vitesse);
    } else if (angle < -ANGLE_MAX) {
      angle = -ANGLE_MAX;
      vitesse = Math.max(0, vitesse);
    }
    reste -= h;
  }
  return { angle, vitesse };
}

/** Bout d'un membre accroché en (x, y). */
export function boutDuMembre(x: number, y: number, angle: number, longueur: number) {
  return { x: x + Math.sin(angle) * longueur, y: y + Math.cos(angle) * longueur };
}

/**
 * Estime l'accélération du doigt à partir de ses positions successives, en la lissant
 * (le toucher est saccadé) et en la bornant.
 */
export class SuiviDoigt {
  private x: number | null = null;
  private y = 0;
  private vx = 0;
  private vy = 0;
  ax = 0;
  ay = 0;

  constructor(
    private readonly lissage = 0.35,
    private readonly borne = 9000,
  ) {}

  suivre(x: number, y: number, dt: number): void {
    if (this.x === null || dt <= 0) {
      this.x = x;
      this.y = y;
      return;
    }
    const vx = (x - this.x) / dt;
    const vy = (y - this.y) / dt;
    const borner = (v: number) => Math.max(-this.borne, Math.min(this.borne, v));
    const axBrut = borner((vx - this.vx) / dt);
    const ayBrut = borner((vy - this.vy) / dt);
    this.ax += (axBrut - this.ax) * this.lissage;
    this.ay += (ayBrut - this.ay) * this.lissage;
    this.vx = vx;
    this.vy = vy;
    this.x = x;
    this.y = y;
  }
}
