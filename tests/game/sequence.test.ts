import { describe, expect, it } from 'vitest';
import type { Evenement } from '../../src/engine/index';
import {
  DUREE_ARRIVEE,
  DUREE_CONSEQUENCE,
  ECART_CONSEQUENCES,
  dureeAnimations,
  planAnimations,
} from '../../src/game/sequence';

const pose: Evenement = {
  type: 'pose',
  tour: 1,
  bande: 'rouge',
  eleveId: 'r1',
  role: 'rapporteuse',
  cible: 'M2',
};
const cpe: Evenement = {
  type: 'cpe',
  tour: 1,
  bande: 'bleu',
  eleveId: 'b1',
  role: 'petit',
  ilot: 'B1',
};
const region: Evenement = {
  type: 'region',
  tour: 1,
  bande: 'rouge',
  region: 'haut',
  bonsPoints: 2,
};

describe('Mise en scène d’un coup', () => {
  it('joue l’arrivée, puis les conséquences l’une après l’autre', () => {
    const plan = planAnimations([pose, cpe, region]);
    expect(plan.map((e) => e.debut)).toEqual([
      0,
      DUREE_ARRIVEE,
      DUREE_ARRIVEE + ECART_CONSEQUENCES,
    ]);
    expect(dureeAnimations([pose, cpe, region])).toBe(
      DUREE_ARRIVEE + ECART_CONSEQUENCES + DUREE_CONSEQUENCE,
    );
  });

  it('sans arrivée, la conséquence commence tout de suite', () => {
    expect(planAnimations([cpe])[0]?.debut).toBe(0);
  });

  it('un appel de copains se voit aussitôt', () => {
    const appel: Evenement = { type: 'appel', tour: 1, bande: 'rouge', nombre: 2 };
    expect(planAnimations([appel])[0]?.debut).toBe(0);
  });

  it('la surveillante finit sa marche avant le goûter qu’elle quitte, puis la victoire', () => {
    const appel: Evenement = { type: 'appel', tour: 2, bande: 'bleu', nombre: 2 };
    const marche: Evenement = {
      type: 'surveillante',
      tour: 2,
      position: 1,
      pas: 1,
      parDelegue: false,
    };
    const fin: Evenement = { type: 'fin', tour: 2, gagnant: 'rouge', raison: 'bonsPoints' };
    const plan = planAnimations([appel, marche, region, fin]);
    const debut = (type: string): number => plan.find((p) => p.ev.type === type)?.debut ?? -1;
    expect(debut('region')).toBeGreaterThanOrEqual(debut('surveillante') + DUREE_CONSEQUENCE);
    expect(debut('fin')).toBeGreaterThanOrEqual(debut('region') + DUREE_CONSEQUENCE);
    expect(dureeAnimations([appel, marche, region, fin])).toBe(debut('fin'));
  });
});
