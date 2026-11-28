import { describe, expect, it } from 'vitest';
import type { Evenement } from '../../src/engine/index';
import {
  DUREE_ARRIVEE,
  DUREE_CONSEQUENCE,
  DUREE_PLAQUAGE,
  DUREE_PUNITION,
  ECART_CONSEQUENCES,
  ECART_PUNITION,
  dureeAnimations,
  planAnimations,
  rondeParcourue,
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
  it('laisse le nuage du plaquage finir avant de redessiner', () => {
    expect(dureeAnimations([{ ...pose, plaque: 'petit' }])).toBe(DUREE_PLAQUAGE);
    expect(DUREE_PLAQUAGE).toBeGreaterThan(DUREE_ARRIVEE);
  });

  it('joue l’arrivée, puis les conséquences l’une après l’autre', () => {
    const plan = planAnimations([pose, region, cpe]);
    expect(plan.map((e) => e.debut)).toEqual([
      0,
      DUREE_ARRIVEE,
      DUREE_ARRIVEE + ECART_CONSEQUENCES,
    ]);
    expect(dureeAnimations([pose, region, cpe])).toBe(
      DUREE_ARRIVEE + ECART_CONSEQUENCES + DUREE_PUNITION,
    );
  });

  it('laisse voir le carton rouge avant la suite, et la marche du puni jusqu’au bout', () => {
    const plan = planAnimations([pose, cpe, region]);
    expect(plan.map((e) => e.debut)).toEqual([0, DUREE_ARRIVEE, DUREE_ARRIVEE + ECART_PUNITION]);
    expect(dureeAnimations([pose, cpe, region])).toBe(DUREE_ARRIVEE + DUREE_PUNITION);
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

describe('La ronde de la surveillante', () => {
  it('un pas : du goûter quitté au suivant', () => {
    expect(rondeParcourue(4, 1, 1)).toEqual([0, 1]);
  });
  it('deux pas (Mot d’excuse) : elle longe le goûter du milieu au lieu de couper la cour', () => {
    expect(rondeParcourue(4, 1, 2)).toEqual([3, 0, 1]);
  });
  it('elle boucle sa ronde', () => {
    expect(rondeParcourue(4, 0, 1)).toEqual([3, 0]);
  });
  it('deux marches dans le même coup s’enchaînent sans retour en arrière', () => {
    // Le Délégué l'envoie de 0 à 2, puis le pas de fin de tour de 2 à 3.
    const premiere = rondeParcourue(4, 2, 2);
    const seconde = rondeParcourue(4, 3, 1);
    expect(seconde[0]).toBe(premiere[premiere.length - 1]);
  });

  it('un 2e élève posé dans le même coup (DF.40) arrive après le premier', () => {
    const deux: Evenement[] = [
      { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'a', role: 'chouchou', cible: 'P' },
      { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'b', role: 'grand', cible: 'Q' },
    ];
    const plan = planAnimations(deux);
    expect(plan.map((p) => p.debut)).toEqual([0, DUREE_ARRIVEE]);
    expect(dureeAnimations(deux)).toBe(2 * DUREE_ARRIVEE);
  });
});
