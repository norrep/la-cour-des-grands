import { describe, expect, it } from 'vitest';
import {
  choisirEquipes,
  equipeDe,
  EQUIPES,
  ORDRE_EQUIPES,
  tenuesPour,
} from '../../src/data/equipes';

describe('Équipes (DE.1)', () => {
  it('chaque équipe a sa tenue, et une seconde, cachée, d’une autre couleur', () => {
    for (const id of ORDRE_EQUIPES) {
      expect(EQUIPES[id].tenue).not.toBe(EQUIPES[id].miroir);
    }
  });

  it('deux équipes différentes gardent chacune leur tenue', () => {
    expect(tenuesPour({ rouge: 'vers', bleu: 'ecoliers' })).toEqual({
      rouge: 'vers',
      bleu: 'rouges',
    });
    expect(tenuesPour({ rouge: 'ecoliers', bleu: 'aliens' })).toEqual({
      rouge: 'rouges',
      bleu: 'aliens',
    });
  });

  it('en miroir, le camp du haut enfile la seconde tenue', () => {
    expect(tenuesPour({ rouge: 'ecoliers', bleu: 'ecoliers' })).toEqual({
      rouge: 'rouges',
      bleu: 'bleus',
    });
    choisirEquipes({ rouge: 'aliens', bleu: 'aliens' });
    expect(equipeDe('rouge').couleur).not.toBe(equipeDe('bleu').couleur);
    expect(equipeDe('bleu').id).toBe('aliens2');
  });
});
