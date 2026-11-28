import type { Evenement } from '../engine/index';

/**
 * Calendrier de la mise en scène d'un coup (sans Phaser, pour être testé) :
 * l'arrivée de l'élève d'abord, puis chaque conséquence à son tour, pour que l'œil suive.
 */

/** Durée de l'arrivée d'un élève : annonce + chute + écrasement (ms). */
export const DUREE_ARRIVEE = 560;
/** Écart entre deux conséquences qui se suivent (ms). */
export const ECART_CONSEQUENCES = 320;
/** Durée d'une conséquence (vol jusqu'à un lieu, marche de la surveillante…) (ms). */
export const DUREE_CONSEQUENCE = 760;

/** Tourbillon du courant de la piscine (ms) : on le laisse finir avant de redessiner. */
export const DUREE_COURANT = 1000;

/**
 * Arrivée avec plaquage : chute, puis le nuage de bagarre (≈ 1,5 s) (ms). On le laisse finir
 * avant de redessiner, sinon il est coupé en plein vol.
 */
export const DUREE_PLAQUAGE = 1800;

/** Petit arrêt de la surveillante sur le goûter où elle arrive, avant la suite (ms). */
export const PAUSE_SURVEILLANTE = 160;

/** Événements qui se voient sur la cour comme une conséquence de l'arrivée. */
function estConsequence(ev: Evenement): boolean {
  return (
    ev.type === 'cpe' ||
    ev.type === 'infirmerie' ||
    ev.type === 'region' ||
    ev.type === 'rappel' ||
    ev.type === 'repechage' ||
    ev.type === 'pioche' ||
    ev.type === 'glissade' ||
    (ev.type === 'surveillante' && ev.pas !== 0)
  );
}

export interface Etape {
  ev: Evenement;
  /** Moment où l'animation de l'événement commence, depuis le coup (ms). */
  debut: number;
}

export function planAnimations(nouveaux: readonly Evenement[]): Etape[] {
  const arrivee = nouveaux.some((ev) => ev.type === 'pose');
  let t = arrivee ? DUREE_ARRIVEE : 0;
  // Fin de la dernière conséquence déjà lancée : la victoire attend qu'elle soit finie.
  let finConsequences = t;
  const plan: Etape[] = [];
  let poses = 0;
  for (const ev of nouveaux) {
    if (ev.type === 'pose' && poses++ > 0) {
      // 2e élève posé dans le même coup (Chouchou appliqué tout seul, DF.40) : il arrive une fois
      // les conséquences du premier jouées, puis les siennes suivent.
      plan.push({ ev, debut: t });
      t += DUREE_ARRIVEE;
      finConsequences = Math.max(finConsequences, t);
    } else if (ev.type === 'pose' || ev.type === 'appel') {
      plan.push({ ev, debut: 0 });
    } else if (estConsequence(ev)) {
      plan.push({ ev, debut: t });
      finConsequences = Math.max(finConsequences, t + DUREE_CONSEQUENCE);
      // La surveillante finit sa marche avant qu'on ramasse le goûter qu'elle quitte.
      t += ev.type === 'surveillante' ? DUREE_CONSEQUENCE + PAUSE_SURVEILLANTE : ECART_CONSEQUENCES;
    } else if (ev.type === 'fin') {
      // La victoire n'arrive qu'une fois toute la cour jouée (marche de la surveillante comprise).
      plan.push({ ev, debut: finConsequences });
    } else {
      plan.push({ ev, debut: t });
    }
  }
  return plan;
}

/** Temps total pour voir tout le coup se jouer sur la cour (ms). */
export function dureeAnimations(nouveaux: readonly Evenement[]): number {
  const plan = planAnimations(nouveaux);
  let fin = 0;
  for (const { ev, debut } of plan) {
    const duree =
      ev.type === 'pose'
        ? ev.plaque
          ? DUREE_PLAQUAGE
          : DUREE_ARRIVEE
        : ev.type === 'courant'
          ? DUREE_COURANT
          : ev.type === 'appel' || estConsequence(ev)
            ? DUREE_CONSEQUENCE
            : 0;
    fin = Math.max(fin, debut + duree);
  }
  return fin;
}

/**
 * Les goûters par lesquels passe la surveillante quand elle avance de `pas` dans sa ronde de
 * `n` goûters pour arriver en `position` : celui qu'elle quitte, ceux qu'elle longe, puis
 * celui où elle s'arrête (indices dans la ronde). Elle suit sa ronde, sans couper la cour.
 */
export function rondeParcourue(n: number, position: number, pas: number): number[] {
  if (n <= 0) return [];
  const mod = (k: number): number => ((k % n) + n) % n;
  const sens = pas < 0 ? -1 : 1;
  const depart = mod(position - pas);
  const etapes = [depart];
  for (let k = 1; k <= Math.abs(pas); k++) etapes.push(mod(depart + sens * k));
  return etapes;
}
