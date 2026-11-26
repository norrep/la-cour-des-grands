import { describe, expect, it } from 'vitest';
import { creerPartie } from '../../src/engine/index';
import { partieAleatoire, simuler } from '../../src/engine/simulation';
import { cour1, courTest } from './aide';

describe('Parties aléatoires', () => {
  it('300 parties sur la cour n°1 se terminent sans erreur et sans casser les invariants', () => {
    const s = simuler(cour1(), 300, 1, (c, g) => creerPartie(c, { graine: g }));
    expect(s.erreurs).toEqual([]);
    expect(s.victoires.rouge + s.victoires.bleu).toBe(300);
  });

  it('200 parties sans équipements', () => {
    const s = simuler(cour1(), 200, 500, (c, g) =>
      creerPartie(c, { graine: g, equipements: false }),
    );
    expect(s.erreurs).toEqual([]);
  });

  for (const equipementQ of [
    'toboggan',
    'buts',
    'porteVieScolaire',
    'cabanePerchee',
    'bancMaitresses',
  ] as const) {
    it(`100 parties sur une cour de test avec ${equipementQ}`, () => {
      const cour = courTest({
        equipementQ,
        regions: [{ id: 'r', nom: 'R', ilots: ['Q', 'L'], bonsPoints: 2 }],
      });
      const s = simuler(cour, 100, 900, (c, g) => creerPartie(c, { graine: g }));
      expect(s.erreurs).toEqual([]);
    });
  }

  it('une même graine rejoue exactement la même partie', () => {
    const cour = cour1();
    const a = partieAleatoire(() => creerPartie(cour, { graine: 77 }), 5);
    const b = partieAleatoire(() => creerPartie(cour, { graine: 77 }), 5);
    expect(a).toEqual(b);
  });
});
