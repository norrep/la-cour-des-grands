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
  const plan: Etape[] = [];
  for (const ev of nouveaux) {
    if (ev.type === 'pose' || ev.type === 'appel') {
      plan.push({ ev, debut: 0 });
    } else if (estConsequence(ev)) {
      plan.push({ ev, debut: t });
      t += ECART_CONSEQUENCES;
    } else {
      // La victoire et le reste arrivent après les conséquences.
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
    const duree = ev.type === 'pose' ? DUREE_ARRIVEE : estConsequence(ev) ? DUREE_CONSEQUENCE : 0;
    fin = Math.max(fin, debut + duree);
  }
  return fin;
}
