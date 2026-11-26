import { describe, expect, it } from 'vitest';
import { alleesDuChemin } from '../../src/game/chemins';
import { courTest, situation } from '../engine/aide';

// Allées de la cour de test : 0 CabR-P, 1 P-Q, 2 P-L, 3 L-Q, 4 Q-D, 5 Q-S, 6 D-S,
// 7 S-X, 8 S-CabB, 9 X-Y, 10 Y-Z (ronde : 10 puis 9).
describe('Chemin à la craie', () => {
  it('est vide tant que la bande n’a aucun îlot', () => {
    expect(alleesDuChemin(situation(), 'rouge')).toEqual([]);
  });

  it('suit les îlots de la bande depuis sa cabane', () => {
    const e = situation({ piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']] } });
    expect(alleesDuChemin(e, 'rouge')).toEqual([0, 1]);
  });

  it('s’arrête sur un îlot adverse ou un îlot non relié', () => {
    const e = situation({
      piles: { P: [['rouge', 'grand']], Q: [['bleu', 'grand']], D: [['rouge', 'grand']] },
    });
    expect(alleesDuChemin(e, 'rouge')).toEqual([0]);
  });

  it('relie les îlots de la bande entre eux, boucles comprises', () => {
    const e = situation({
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], L: [['rouge', 'grand']] },
    });
    expect(alleesDuChemin(e, 'rouge')).toEqual([0, 1, 2, 3]);
  });

  it('ne passe pas par l’allée bloquée par la surveillante', () => {
    const cour = courTest({ ronde: [['P', 'Q']] });
    const e = situation({ cour, piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']] } });
    expect(alleesDuChemin(e, 'rouge')).toEqual([0]);
  });

  it('chaque bande a son propre chemin', () => {
    const e = situation({ piles: { S: [['bleu', 'grand']], P: [['rouge', 'grand']] } });
    expect(alleesDuChemin(e, 'bleu')).toEqual([8]);
    expect(alleesDuChemin(e, 'rouge')).toEqual([0]);
  });
});
